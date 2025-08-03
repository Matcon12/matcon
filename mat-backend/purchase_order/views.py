from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser

import re

from datetime import datetime
# from django.forms import model_to_dict
from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404
from .models import SupplierProductMaster, CustomerMaster, CustomerPurchaseOrder, GstRates, GstStateCode, OtwDc, FinalPo
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.db.models import Max, F, Sum
from django.db import transaction, DatabaseError, connection
import pandas as pd
import datetime as d
from babel.numbers import format_currency
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.forms.models import model_to_dict
from collections import Counter
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_DOWN, InvalidOperation
from .serializers import UserSerializer

import logging
import decimal

import xlsxwriter

# Set up logging
logger = logging.getLogger(__name__)

# Create your views here.
def index(request):
  customer_purchase_order = CustomerPurchaseOrder.objects.all()
  return JsonResponse(list(customer_purchase_order.values()), safe=False)
  # return HttpResponse("Hello, world. You're at the purchase_order index.")

def convert_rupees_to_words(amount):
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", 
            "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen","Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    thousands = ["", "Thousand", "Lakh", "Crore"]
    def convert_two_digits(num):
        if num < 20:
            return ones[num] + " "
        else:
            return tens[num // 10] + " " + ones[num % 10]
    def convert_three_digits(num):
        if num < 100:
            return convert_two_digits(num)
        else:
            return ones[num // 100] + " Hundred " + convert_two_digits(num % 100)
    result = ""    
    amount = format(amount, ".2f")
    RsPs = str(amount).split('.')
    Rs = int(RsPs[0])
    Ps = int(RsPs[1])
    if Rs == 0:
        result += "Zero "
    else:
        for i in range(4):
            if i == 0 or i == 3:
                chunk = Rs % 1000
                Rs //= 1000
            else:
                chunk = Rs % 100
                Rs //= 100
            if chunk != 0:
                result = convert_three_digits(chunk) + " " + thousands[i] + " " +result
    if Ps > 0:
        result = result.strip() + " and Paise " + convert_two_digits(Ps)        
    result = "Rupees " + result.strip() + " Only"
    return result.upper()

@csrf_exempt
def get_pack_size(request):
    if request.method == 'GET':
        try:
            prod_id = request.GET.get('prodId')  # Change to GET
            if prod_id:
                result = SupplierProductMaster.objects.get(prod_id=prod_id)
                return JsonResponse({
                  'pack_size': result.pack_size,
                  'prod_desc': result.prod_desc,
                  'price': result.price,
                })
            else:
                return JsonResponse({'error': 'prodId parameter is missing'}, status=400)
        except ObjectDoesNotExist:
            return JsonResponse({'pack_size': '', 'prod_desc': ''})
    else:
        return JsonResponse({'error': 'Only GET requests are allowed'}, status=405)  # Update error message

def get_customer_detail(request):
  if request.method == 'GET':
    try:
      cust_id = request.GET.get('customerId')
      if cust_id:
        result = CustomerMaster.objects.get(cust_id=cust_id)
        return JsonResponse({
          'customer_name': result.cust_name,
          'gst_exemption': result.gst_exemption,
        })
      else:
        return JsonResponse({'error': 'customerId parameter is missing'}, status=400)
    except ObjectDoesNotExist:
      return JsonResponse({'customer_name': ''})
  else: 
    return JsonResponse({'error': 'Only GET requests are allowed'}, status=405)
  
def round_decimal(value, decimal_places=2):
    return Decimal(value).quantize(Decimal(f'1.{"0"*decimal_places}'), rounding=ROUND_DOWN)

from django.core.exceptions import ValidationError

@csrf_exempt
def submit_form(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            formData = data.get('formData')
            productDetails = data.get('productDetails')

            response_data = {
                'formData': formData,
                'productDetails': productDetails
            }

            created_orders = []

            # Extract location from formData with default
            location = formData.get('location', 'HBL')   
            
            # Validate location
            valid_locations = ['HBL', 'ASP']
            if location not in valid_locations:
                return JsonResponse({'error': f'Invalid location: {location}. Must be one of: {valid_locations}'}, status=400)
            
            logger.info(f"Processing form with location: {location}")
            
            formData['poDate'] = datetime.strptime(formData.get('poDate', ''), '%d-%m-%Y').strftime('%Y-%m-%d') if formData['poDate'] else None
            formData['poValidity'] = datetime.strptime(formData.get('poValidity', ''), '%d-%m-%Y').strftime('%Y-%m-%d') if formData['poValidity'] else None

            with transaction.atomic():
                for product in productDetails:
                    # Check if the order already exists
                    if CustomerPurchaseOrder.objects.filter(pono=formData.get('poNo'), po_sl_no=product.get('poSlNo')).exists():
                        return JsonResponse({"error": "Purchase Order with the same PoNo and PO Sl no. already exists"}, status=400)

                    max_slno = CustomerPurchaseOrder.objects.aggregate(Max('slno'))['slno__max']
                    new_slno = max_slno + 1 if max_slno else 1

                    delivery_date = product.get('deliveryDate', None)
                    if delivery_date:
                        delivery_date = datetime.strptime(delivery_date, '%d-%m-%Y').strftime('%Y-%m-%d')

                    # Handle kit products vs regular products
                    prod_code = product.get('prodId', '')
                    po_sl_no = product.get('poSlNo', '')
                    is_kit = prod_code.startswith('KIT')
                    is_kit_component = po_sl_no and '.' in po_sl_no  # Kit components have po_sl_no like "2.1", "2.2"
                    
                    if is_kit or is_kit_component:
                        logger.info(f"Processing {'kit component' if is_kit_component else 'kit product'}: {prod_code}")
                        unit_price = 0  # Kit products and components don't have individual unit prices
                    else:
                        logger.info(f"Processing regular product: {prod_code}")
                        unit_price = round_decimal(product.get('unitPrice', 0))
                    
                    total_price = round_decimal(product.get('totalPrice', 0))
                    qty = round_decimal(product.get('quantity', 0))

                    order = CustomerPurchaseOrder(
                        slno=new_slno,
                        pono=formData.get('poNo'),
                        podate=formData.get('poDate'),
                        quote_id=formData.get('quoteId'),
                        quote_date=formData.get('poValidity'),
                        cust=CustomerMaster.objects.get(cust_id=formData.get('customerId')),
                        consignee_id=formData.get('consigneeId'),
                        po_sl_no=product.get('poSlNo'),
                        prod_code=prod_code,
                        prod_desc=product.get('productDesc'),
                        additional_desc=product.get('msrr'),
                        hsn_sac=product.get('hsn_sac'),
                        pack_size=product.get('packSize'),
                        quantity=qty,
                        unit_price=unit_price,
                        uom=product.get('uom'),
                        total_price=total_price,
                        qty_sent=0.00,
                        qty_balance=qty,
                        delivery_date=delivery_date,
                        po_validity=formData.get('poValidity'),
                        location=location,
                    )
                    try:
                        order.full_clean()  # Validate the model instance
                        order.save()
                        created_orders.append(order)
                    except ValidationError as e:
                        raise e  # This will trigger a rollback

            response_data['createdOrders'] = [{'slno': order.slno} for order in created_orders]

            return JsonResponse({"error": "Purchase Order created successfully!!", "details": response_data})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)
        except ValidationError as e:
            return JsonResponse({'error': e.message_dict, "message": "Validation error occurred!!"}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e), 'message': "An error occurred while processing the data"}, status=500)

    return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

# def get_data_purchase_order(request):   
#     if request.method == 'GET':
#         try:
#             po_no = request.GET.get('pono')
#             data = CustomerPurchaseOrder.objects.filter(pono=po_no).first()
#             # distinct_pono = list(CustomerPurchaseOrder.objects.values('pono').distinct().order_by('pono'))
#             # po_sl_nos = list(CustomerPurchaseOrder.objects.filter(pono=po_no).order_by('po_sl_no').values_list('po_sl_no', flat=True).distinct())
#             po_sl_nos = CustomerPurchaseOrder.objects.filter(pono=po_no).order_by('po_sl_no')
            
#             # if po_sl_nos:
#             if data:
#                 data_dict = model_to_dict(data)

#                 po_sl_nos_values = po_sl_nos.values('po_sl_no')
                
#                 # Return the data directly from model_to_dict without any conversions
#                 return JsonResponse({"success": True, "data": data_dict, "po_sl_nos": po_sl_nos_values})
#             else:
#                 return JsonResponse({"success": False, "error": "Data not found"})
#         except ObjectDoesNotExist:
#             return JsonResponse({'error': 'Data not found'}, status=400)

def get_data_purchase_order(request):
    if request.method == 'GET':
        try:
            po_no = request.GET.get('pono')
            data = CustomerPurchaseOrder.objects.filter(pono=po_no).order_by('po_sl_no').first()

            if data:
                data_dict = model_to_dict(data)
                po_sl_nos = CustomerPurchaseOrder.objects.filter(pono=po_no, po_sl_no__regex=r'^[^.]+$').values('po_sl_no').order_by('po_sl_no')
                po_nos = CustomerPurchaseOrder.objects.filter(pono=po_no).values_list('po_sl_no', flat=True).order_by('po_sl_no')
                filtered_po_sl_nos = [no for no in po_nos if no.startswith(data_dict['po_sl_no'] + ".")]
                filtered_data = CustomerPurchaseOrder.objects.filter(pono=po_no, po_sl_no__in=filtered_po_sl_nos)
                filtered_data_dicts = [model_to_dict(item) for item in filtered_data]
                total_sum = CustomerPurchaseOrder.objects.filter(pono=po_no).aggregate(total_sum=Sum('total_price'))['total_sum']
                

                return JsonResponse({
                    "success": True,
                    "data": data_dict,
                    "po_sl_nos": list(po_sl_nos),
                    "filtered_data": filtered_data_dicts,
                    "total_sum": total_sum
                })
            else:
                return JsonResponse({"success": False, "error": "Data not found"})
        except ObjectDoesNotExist:
            return JsonResponse({'error': 'Data not found'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)


def get_data_po_cust(request):
    if request.method == 'GET':
        try:
            cust_id = request.GET.get('cust_id')
            po_no = request.GET.get('po_no')
            po_sl_no = request.GET.get('po_sl_no')
            if cust_id and po_no and po_sl_no:
                data = list(CustomerPurchaseOrder.objects.filter(cust__cust_id=cust_id, pono=po_no, po_sl_no=po_sl_no).order_by('po_sl_no').values())
                
                # Check if the main product is a KIT
                is_kit = False
                if data and len(data) > 0:
                    main_product_code = data[0].get('prod_code', '')
                    is_kit = main_product_code.startswith('KIT')
                
                po_nos = CustomerPurchaseOrder.objects.filter(pono=po_no).values_list('po_sl_no', flat=True).order_by('po_sl_no')
                filtered_po_sl_nos = [no for no in po_nos if no.startswith(po_sl_no + ".")]
                filtered_data = CustomerPurchaseOrder.objects.filter(pono=po_no, po_sl_no__in=filtered_po_sl_nos)
                filtered_data_dicts = [model_to_dict(item) for item in filtered_data]
                total_sum = CustomerPurchaseOrder.objects.filter(pono=po_no).aggregate(total_sum=Sum('total_price'))['total_sum']
                return JsonResponse({
                    "success": True, 
                    "data": data, 
                    "filtered_data": filtered_data_dicts, 
                    "total_sum": total_sum,
                    "is_kit": is_kit
                })
            else:
                return JsonResponse({'error': 'parameters are missing'}, status=400)
        except ObjectDoesNotExist:
            return JsonResponse({'error': 'data not found'}, status=400)

    
def convert_date_format(date_str):
    # Parse the date string into a datetime object
    date_obj = datetime.strptime(date_str, '%d-%m-%Y')
    # Convert the datetime object into the desired format
    formatted_date = date_obj.strftime('%Y-%m-%d')
    return formatted_date

def validate_common_columns(search_data):
    """
    Validate that required common columns are present and valid
    """
    required_fields = ['podate', 'location']
    missing_fields = [field for field in required_fields if not search_data.get(field)]
    
    if missing_fields:
        return False, f"Missing required common columns: {', '.join(missing_fields)}"
    
    # Validate date formats if present
    date_fields = ['podate', 'po_validity']
    for field in date_fields:
        if search_data.get(field):
            try:
                # Try to parse the date to ensure it's valid
                datetime.strptime(search_data.get(field), '%d-%m-%Y')
            except ValueError:
                return False, f"Invalid date format for {field}. Expected format: DD-MM-YYYY"
    
    return True, None

@csrf_exempt
def update_purchase_order(request):
    if request.method == 'PUT':
        try:
            data = request.body.decode('utf-8')
            result = json.loads(data)

            search_inputs = result.get('searchData', {})
            cust_id = search_inputs.get('customer_id')
            po_no = search_inputs.get('pono')
            po_sl_no = search_inputs.get('po_sl_no')

            kit_data = result.get('kitData', [])

            if not all([cust_id, po_no, po_sl_no]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            # Extract common columns that should be synchronized across all related records
            search_data = result.get('searchData', {})
            
            # Validate common columns before proceeding
            is_valid, error_message = validate_common_columns(search_data)
            if not is_valid:
                return JsonResponse({'error': error_message}, status=400)
            
            # Use atomic transaction to ensure all-or-nothing updates
            with transaction.atomic():
                # Convert date fields for common columns
                common_columns = {
                    'podate': convert_date_format(search_data.get('podate')) if search_data.get('podate') else None,
                    'po_validity': convert_date_format(search_data.get('po_validity')) if search_data.get('po_validity') else None,
                    'quote_id': search_data.get('quote_id'),
                    'consignee_id': search_data.get('consignee_id'),
                    'location': search_data.get('location')
                }

                # Find ALL records associated with the given PO number
                # This includes ALL records with the same pono, regardless of po_sl_no hierarchy
                all_records_to_update = CustomerPurchaseOrder.objects.filter(
                    cust_id=cust_id, 
                    pono=po_no
                )
                
                # Get the main record for specific updates
                main_record = CustomerPurchaseOrder.objects.get(cust__cust_id=cust_id, pono=po_no, po_sl_no=po_sl_no)

                # Step 1: Update common columns for ALL related records
                for record in all_records_to_update:
                    for field, value in common_columns.items():
                        if hasattr(record, field) and value is not None:
                            setattr(record, field, value)
                    record.save()

                # Step 2: Update the main record with all searchData fields (with proper date conversion)
                for key, value in search_data.items():
                    if hasattr(main_record, key):
                        # Convert date fields before setting
                        if key in ['podate', 'po_validity', 'delivery_date'] and value:
                            try:
                                converted_value = convert_date_format(value)
                                setattr(main_record, key, converted_value)
                            except ValueError as e:
                                return JsonResponse({'error': f"Invalid date format for {key}: {value}. Expected DD-MM-YYYY format."}, status=400)
                        else:
                            setattr(main_record, key, value)
                main_record.save()

                # Step 3: Update kitData records with their specific fields (excluding common columns)
                for kit_item in kit_data:
                    # Use the main record's cust_id since all records in the same PO belong to the same customer
                    kit_cust_id = cust_id  # Use the main record's cust_id instead of kit_item.get('customer_id')
                    kit_po_no = kit_item.get('pono')
                    kit_po_sl_no = kit_item.get('po_sl_no')

                    if not all([kit_cust_id, kit_po_no, kit_po_sl_no]):
                        continue

                    try:
                        # Fetch the kit record to update
                        kit_record = CustomerPurchaseOrder.objects.get(cust__cust_id=kit_cust_id, pono=kit_po_no, po_sl_no=kit_po_sl_no)

                        # Update the kit record with product-specific values from kitData
                        # Exclude common columns as they're already updated above
                        product_specific_fields = [
                            'prod_code', 'prod_desc', 'additional_desc', 'pack_size',
                            'quantity', 'unit_price', 'uom', 'hsn_sac', 'total_price',
                            'qty_balance', 'qty_sent', 'delivery_date'
                        ]
                        
                        for key, value in kit_item.items():
                            if key in product_specific_fields and hasattr(kit_record, key):
                                # Convert date fields for kit records too
                                if key == 'delivery_date' and value:
                                    try:
                                        converted_value = convert_date_format(value)
                                        setattr(kit_record, key, converted_value)
                                    except ValueError as e:
                                        return JsonResponse({'error': f"Invalid date format for {key}: {value}. Expected DD-MM-YYYY format."}, status=400)
                                else:
                                    setattr(kit_record, key, value)

                        # Try the save operation
                        kit_record.save()
                        
                        # If the model is unmanaged, try using update() as a fallback
                        if not CustomerPurchaseOrder._meta.managed:
                            update_fields = {}
                            for key, value in kit_item.items():
                                if key in product_specific_fields and hasattr(kit_record, key):
                                    if key == 'delivery_date' and value:
                                        try:
                                            converted_value = convert_date_format(value)
                                            update_fields[key] = converted_value
                                        except ValueError as e:
                                            return JsonResponse({'error': f"Invalid date format for {key}: {value}. Expected DD-MM-YYYY format."}, status=400)
                                    else:
                                        update_fields[key] = value
                            
                            if update_fields:
                                CustomerPurchaseOrder.objects.filter(
                                    cust_id=kit_cust_id, 
                                    pono=kit_po_no, 
                                    po_sl_no=kit_po_sl_no
                                ).update(**update_fields)
                    except CustomerPurchaseOrder.DoesNotExist:
                        return JsonResponse({'error': f"Kit record with po_sl_no {kit_po_sl_no} not found"}, status=404)

                # If we reach here, all updates were successful
                kit_update_count = len(kit_data) if kit_data else 0
                
                return JsonResponse({
                    'success': True, 
                    'message': f'Updated {len(all_records_to_update)} records with synchronized common columns. Updated {kit_update_count} kit components.',
                    'updated_records': [record.po_sl_no for record in all_records_to_update],
                    'kit_updates': kit_update_count
                })
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
@csrf_exempt
def add_customer_details(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            data = data.get('formData', {})
            
            with transaction.atomic():
                customer = CustomerMaster.objects.create(
                    cust_id=data.get('Cust_ID'),
                    cust_name=data.get('Cust_Name'),
                    cust_addr1=data.get('Cust_addr1'),
                    cust_addr2=data.get('Cust_addr2'),
                    cust_city=data.get('Cust_City'),
                    cust_st_code=data.get('Cust_St_Code'),
                    cust_st_name=data.get('Cust_St_Name'),
                    cust_pin=data.get('Cust_PIN'),
                    cust_gst_id=data.get('Cust_GST_ID'),
                    contact_name_1 = data.get('contact_name_1'),
                    contact_phone_1 = data.get('contact_phone_1'),
                    contact_email_1 = data.get('contact_email_1'),
                    contact_name_2 = data.get('contact_name_2'),
                    contact_phone_2 = data.get('contact_phone_2'),
                    contact_email_2 = data.get('contact_email_2'),
                    gst_exemption = data.get('gst_exemption'),
                )
            
            # Ensure the connection is closed
            connection.close()
            
            return JsonResponse({'success': True, 'customer_id': customer.cust_id})
        
        except DatabaseError as e:
            return JsonResponse({'error': 'Database error: ' + str(e)}, status=500) 
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    else:
        return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

    
def get_customer_details(request):
   if request.method =='GET':
      try:
         cust_id = request.GET.get('cust_id')
         if cust_id:
            result = CustomerMaster.objects.get(cust_id=cust_id)
            return JsonResponse({
               'cust_name': result.cust_name,
               'cust_addr1': result.cust_addr1,
               'cust_addr2': result.cust_addr2,
               'cust_city': result.cust_city,
               'cust_st_code': result.cust_st_code,
               'cust_st_name': result.cust_st_name,
               'cust_pin': result.cust_pin,
               'cust_gst_id': result.cust_gst_id,
               'contact_name_1': result.contact_name_1,
               'contact_phone_1': result.contact_phone_1,
               'contact_email_1': result.contact_email_1,
               'contact_name_2': result.contact_name_2,
               'contact_phone_2': result.contact_phone_2,
               'contact_email_2': result.contact_email_2,
               'gst_exemption': result.gst_exemption,
            })
         else:
            return JsonResponse({'error': 'cust_id parameter is missing'}, status=400)
      except ObjectDoesNotExist:
         return JsonResponse({'customer_name': ''})
   else: 
      return JsonResponse({"error: Only GET requests are allowed"}, status=405)

@csrf_exempt
def update_customer_details(request):
    if request.method == 'PUT':
        try:
            data = request.body.decode('utf-8')
            result = json.loads(data)
            result = result.get('formData', {})
            
            # Fetch the record to update
            record = CustomerMaster.objects.get(cust_id=result.get('cust_id'))
            # Update the record with new values from searchData
            for key, value in result.items():
                if hasattr(record, key):
                    setattr(record, key, value)
                else:
                    print(f"Invalid key: {key}")
            
            record.save()
            
            return JsonResponse({'success': True})
        except CustomerPurchaseOrder.DoesNotExist:
            return JsonResponse({'error': 'Record not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
       return JsonResponse({"error: Only PUT requests are allowed"}, status=405)
    
@csrf_exempt
def add_product_details(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            data = data.get('formData', {})

            prod_id = data.get('Prod_ID', '').upper()
            
            with transaction.atomic():
                customer = SupplierProductMaster.objects.create(
                   prod_id=prod_id,
                   supp_id=data.get('Supp_ID'),
                   prod_desc=data.get('Prod_Desc'),
                   spec_id=data.get('Spec_ID'),
                   pack_size=data.get('Pack_Size'),
                   currency=data.get('Currency'),
                   price=data.get('Price'),
                   hsn_code=data.get("hsn_code"),
                )
            
            # Ensure the connection is closed
            connection.close()
            
            return JsonResponse({'success': True, 'customer_id': customer.prod_id})
        
        except DatabaseError as e:
            return JsonResponse({'error': 'Database error: ' + str(e)}, status=500) 
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    else:
        return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

def get_product_details(request):
   if request.method =='GET':
      try:
         prod_id = request.GET.get('prod_id')
         if prod_id:
            result = SupplierProductMaster.objects.get(prod_id=prod_id)
            return JsonResponse({
                "prod_id": result.prod_id,
                "supp_id": result.supp_id,
                "prod_desc": result.prod_desc,
                "spec_id": result.spec_id,
                "pack_size": result.pack_size,
                "currency": result.currency,
                "price": result.price, 
                "hsn_code": result.hsn_code,
            })
         else:
            return JsonResponse({'error': 'prod_id parameter is missing'}, status=400)
      except ObjectDoesNotExist:
         return JsonResponse({'customer_name': ''})
   else: 
      return JsonResponse({"error: Only GET requests are allowed"}, status=405)
   
@csrf_exempt
def update_product_details(request):
    if request.method == 'PUT':
        try:
            data = request.body.decode('utf-8')
            result = json.loads(data)
            result = result.get('formData', {})
            
            # Fetch the record to update
            record = SupplierProductMaster.objects.get(prod_id=result.get('prod_id'))
            # Update the record with new values from searchData
            for key, value in result.items():
                if hasattr(record, key):
                    setattr(record, key, value)
                else:
                    print(f"Invalid key: {key}")
            
            record.save()
            
            return JsonResponse({'success': True})
        except SupplierProductMaster.DoesNotExist:
            return JsonResponse({'error': 'Record not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
       return JsonResponse({"error: Only PUT requests are allowed"}, status=405)
    
@csrf_exempt
def invoice_processing(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        print("data: ", data)
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        print(f"Error parsing request data: {e}")
        return JsonResponse({"error": "Error processing request data"}, status=400)

    po_no = data['formData2'].get('poNo').strip()
    cust_id = data['formData2'].get('customerId')
    new_cons_id = data['formData2'].get('newConsigneeName', '')
    contact_name = data['formData2'].get('contactName')
    location = data['formData2'].get('location', 'HBL')  # Extract location from frontend
    
    # Validate location
    valid_locations = ['HBL', 'ASP']
    if location not in valid_locations:
        return JsonResponse({'error': f'Invalid location: {location}. Must be one of: {valid_locations}'}, status=400)
    
    freight_charges = data['formData2'].get('freightCharges')
    insurance_charges = data['formData2'].get('insuranceCharges')
    other_charges = data['formData2'].get('otherCharges')

    print("other_charges: ", other_charges  )

    contact_nums = CustomerMaster.objects.filter(cust_id=cust_id).values().first()
    print(contact_nums)
    gst_exemption = contact_nums['gst_exemption']
    print("gst_exemption: ", gst_exemption)
    if not contact_nums:
        return JsonResponse({"error": "Customer not found"}, status=404)
    contact = contact_nums['contact_phone_1'] if contact_nums['contact_name_1'] == contact_name else contact_nums['contact_phone_2']
    

    po_sl_numbers = []
    qty_tobe_del = []
    hsn = []
    noOfBatches = []
    batch_coc_quant = dict()
    
    # Track kit components for main kit calculation
    kit_components = {}  # {main_kit_po_sl_no: [component_po_sl_nos]}
    main_kit_totals = {}  # {main_kit_po_sl_no: total_quantity}

    for item in data['formData2']['items']:
        po_sl_no = item['poSlNo']
        
        # Process main item (regular product or main kit)
        po_sl_numbers.append(po_sl_no)
        qty_tobe_del.append(item['quantities'])
        hsn.append(item['hsnSac'])
        noOfBatches.append(item['noOfBatches'])
        batch_coc_quant[po_sl_no] = item['batch_coc_quant']
        
        # Process kit components if present
        if 'kitComponents' in item and item['kitComponents']:
            print(f"Processing kit components for main kit {po_sl_no}")
            for kit_component in item['kitComponents']:
                component_po_sl_no = kit_component['po_sl_no']  # "2.1", "2.2"
                print(f"  -> Processing kit component: {component_po_sl_no}")
                
                # Add component to processing lists
                po_sl_numbers.append(component_po_sl_no)
                qty_tobe_del.append(kit_component['quantity'])
                hsn.append(kit_component['hsnSac'])
                noOfBatches.append(1)  # Default for components
                batch_coc_quant[component_po_sl_no] = {
                    "batch": [""],
                    "coc": [""],
                    "quantity": [kit_component['quantity']]
                }
                
                # Track for main kit calculation
                main_kit = component_po_sl_no.split('.')[0]
                if main_kit not in kit_components:
                    kit_components[main_kit] = []
                    main_kit_totals[main_kit] = 0
                kit_components[main_kit].append(component_po_sl_no)
                print(f"  -> Added {component_po_sl_no} to kit {main_kit}")
    # return JsonResponse({"hsn": hsn, "po_sl_numbers": po_sl_numbers, "qty_tobe_del": qty_tobe_del, "batch_coc_quant": batch_coc_quant })
    # {
    #     "hsn": ["1213", "8569"],
    #     "po_sl_numbers": ["1", "2"],
    #     "qty_tobe_del": [3, 1],
    #     "batch_coc_quant": {
    #         "1": {
    #             "batch": [895655, 888888],
    #             "coc": [1515, 5151],
    #             "quantity": [1, 2]
    #         },
    #         "2": {
    #             "batch": [9999],
    #             "coc": [8888],
    #             "quantity": [1]
    #         }
    #     }
    # }
    data_inw = CustomerPurchaseOrder.objects.filter(pono=po_no, po_sl_no__in=po_sl_numbers)
    # data_inw = CustomerPurchaseOrder.objects.filter(pono=po_no)

    data_dict_inw = list(data_inw.values())
    df_inw = pd.DataFrame(data_dict_inw)

    # return JsonResponse({"df_inw": df_inw.to_dict()})

    if df_inw.empty:
        return JsonResponse({"error": "No matching records in the database"}, status=404)

    if gst_exemption is None:
        gst_exemption = df_inw.iloc[0].get('gst_exemption', gst_exemption)

    if freight_charges:
        new_row = {
            'slno': '',
            'pono': '',
            'podate': None,
            'quote_id': '',
            'quote_date': None,
            'cust_id': '',
            'consignee_id': '',
            'po_sl_no': 'fr',
            'prod_code': '',
            'prod_desc': 'Packing forwarding with Freight charges',
            'additional_desc': '',
            # 'omat': '',
            'pack_size': '',
            'quantity': 1,
            'unit_price': freight_charges,
            'uom': 'No',
            'hsn_sac': '9965',
            'total_price': freight_charges,
            'qty_balance': 1,
            'qty_sent': 1,
            'delivery_date': None,
            'po_validity': None,
            'gst_exemption': '',
        }

        po_sl_numbers.append('fr')
        qty_tobe_del.append(1)
        hsn.append('9965')
        subitems = {
            "batch": [""],
            "coc": [""],
            "quantity": [1]
        }
        batch_coc_quant['fr'] = subitems
        index_to_insert = len(df_inw)
        df_inw.loc[index_to_insert] = new_row
        noOfBatches.append(1)

    if insurance_charges:
        new_row = {
            'slno': '',
            'pono': '',
            'podate': None,
            'quote_id': '',
            'quote_date': None,
            'cust_id': '',
            'consignee_id': '',
            'po_sl_no': 'ins',
            'prod_code': '',
            'prod_desc': 'Insurance Charges',
            'additional_desc': '',
            # 'omat': '',
            'pack_size': '',
            'quantity': 1,
            'unit_price': insurance_charges,
            'uom': 'No',
            'hsn_sac': '9971',
            'total_price': insurance_charges,
            'qty_balance': 1,
            'qty_sent': 1,
            'delivery_date': None,
            'po_validity': None,
            'gst_exemption': '',
        }

        po_sl_numbers.append('ins')
        qty_tobe_del.append(1)
        hsn.append('9971')
        subitems = {
            "batch": [""],
            "coc": [""],
            "quantity": [1]
        }
        batch_coc_quant['ins'] = subitems
        index_to_insert = len(df_inw)
        df_inw.loc[index_to_insert] = new_row
        noOfBatches.append(1)
        
    if other_charges["value"]:
        new_row = {
            'slno': '',
            'pono': '',
            'podate': None,
            'quote_id': '',
            'quote_date': None,
            'cust_id': '',
            'consignee_id': '',
            'po_sl_no': 'oc',
            'prod_code': '',
            'prod_desc': "Other Charges - " + other_charges["key"] if other_charges["key"] else "Other Charges",
            'additional_desc': '',
            # 'omat': '',
            'pack_size': '',
            'quantity': 1,
            'unit_price': other_charges["value"],
            'uom': 'No',
            'hsn_sac': '9971',
            'total_price': other_charges["value"],
            'qty_balance': 1,
            'qty_sent': 1,
            'delivery_date': None,
            'po_validity': None,
            'gst_exemption': '',
        }

        po_sl_numbers.append('oc')
        qty_tobe_del.append(1)
        hsn.append('9971')
        subitems = {
            "batch": [""],
            "coc": [""],
            "quantity": [1]
        }
        batch_coc_quant['oc'] = subitems
        index_to_insert = len(df_inw)
        df_inw.loc[index_to_insert] = new_row
        noOfBatches.append(1)
        
    current = d.datetime.now()
    current_yyyy = current.year
    current_mm = current.month
    
    # return JsonResponse({"hsn": hsn, "po_sl_numbers": po_sl_numbers, "qty_tobe_del": qty_tobe_del, "batch_coc_quant": batch_coc_quant })

    fin_year = int(get_object_or_404(GstRates, id=1).fin_year)

    print(fin_year, current_yyyy, current_mm)

    if fin_year < current_yyyy and current_mm > 3:
        fin_year = current_yyyy
        GstRates.objects.filter(id=1).update(fin_year=fin_year, last_gcn_no=0)
    f_year = fin_year + 1
    fyear = str(f_year)[2:]

    gcn_no = get_object_or_404(GstRates, id=1).last_gcn_no
    new_gcn_no = gcn_no + 1

    gcn_num = f"{str(new_gcn_no).zfill(3)}/{str(fin_year)}-{str(fyear)}"

    current_date = current
    date = str(current_date.strftime('%Y-%m-%d'))

    df_inw.rename(columns={"id": "matcode", "cust_id_id": "cust_id"}, inplace=True)

    # return JsonResponse({"df_inw": df_inw.to_dict()})

    df_inw["cust_id"] = cust_id
    df_inw["gcn_no"] = gcn_num
    df_inw["gcn_date"] = date
    #--------------------------------- TJ ----------------------------------
    # df_inw["consignee_id"] = cust_id if new_cons_id == '' else new_cons_id
    if new_cons_id != '':
        df_inw["consignee_id"] = new_cons_id
    #-----------------------------------------------------------------------
    # return JsonResponse({"df_inw": df_inw.to_dict()})

    qty_dict = dict(zip(po_sl_numbers, qty_tobe_del))
    hsn_dict = dict(zip(po_sl_numbers, hsn))
    df_inw['qty_tobe_del'] = df_inw['po_sl_no'].map(qty_dict)
    df_inw['hsn'] = df_inw['po_sl_no'].map(hsn_dict)

    # Calculate actual quantities and validate
    try:
        for index, row in df_inw.iterrows():
            po_sl_no = row['po_sl_no']
            frontend_qty = row['qty_tobe_del']
            prod_code = row.get('prod_code', '')
            
            # Check if this is a main kit product or kit component
            is_main_kit = prod_code.startswith('KIT')
            is_kit_component = po_sl_no and '.' in po_sl_no  # Kit components have po_sl_no like "2.1", "2.2"
            
            # Extract numeric value from pack_size (handle cases like '5 Ltr')
            pack_size_raw = row.get('pack_size', 1) or 1
            if isinstance(pack_size_raw, str):
                import re
                pack_size_match = re.search(r'(\d+(?:\.\d+)?)', str(pack_size_raw))
                if pack_size_match:
                    pack_size = float(pack_size_match.group(1))
                else:
                    pack_size = 1.0  # Default to 1 if no numeric value found
            else:
                pack_size = float(pack_size_raw)
            
            # For main kit products and kit components, set pack_size to 1 to avoid multiplication issues
            if is_main_kit or is_kit_component:
                pack_size = 1.0
                print(f"{'Kit component' if is_kit_component else 'Main kit product'} detected for {po_sl_no}, setting pack_size to 1.0")
            
            qty_balance = row['qty_balance']
            quantity = row['quantity']
            
            print(f"Processing {po_sl_no}: frontend_qty={frontend_qty}, pack_size={pack_size}")
            
            # Skip validation for special rows (freight, insurance, other charges)
            if po_sl_no in ['fr', 'ins', 'oc']:
                print(f"Skipping special row: {po_sl_no}")
                continue
            
            # Handle None or NaN values
            if frontend_qty is None or pd.isna(frontend_qty):
                print(f"Invalid quantity for {po_sl_no}: {frontend_qty}")
                return JsonResponse({"error": f"Invalid quantity for {po_sl_no}: quantity is None or NaN"}, status=400)
            
            try:
                # Extract numeric value from frontend_qty (handle cases like '5 Ltr')
                if isinstance(frontend_qty, str):
                    # Try to extract the first number from the string
                    import re
                    numeric_match = re.search(r'(\d+(?:\.\d+)?)', str(frontend_qty))
                    if numeric_match:
                        frontend_qty = float(numeric_match.group(1))
                    else:
                        print(f"Could not extract numeric value from '{frontend_qty}' for {po_sl_no}")
                        return JsonResponse({"error": f"Could not extract numeric value from quantity '{frontend_qty}' for {po_sl_no}"}, status=400)
                else:
                    frontend_qty = float(frontend_qty)
                
                # Calculate actual quantity based on product type
                if is_main_kit or is_kit_component:
                    # For main kit products and kit components, actual_qty should be the sum of kit components' quantities
                    # This will be calculated later in the kit component processing section
                    actual_qty = frontend_qty * pack_size  # This will be overridden later
                    print(f"Main kit {po_sl_no}: initial actual_qty={actual_qty} (will be updated with sum of kit components)")
                else:
                    # For regular products and kit components: frontend_qty * pack_size
                    actual_qty = frontend_qty * pack_size
                    print(f"Calculated actual_qty for {po_sl_no}: {actual_qty}")
                
                # Update the dataframe with actual quantity
                df_inw.at[index, 'qty_tobe_del'] = actual_qty
                
                # Validate against balance
                if (actual_qty > 0):
                    # Extract numeric values from qty_balance and quantity if they are strings
                    try:
                        if isinstance(qty_balance, str):
                            qty_balance_match = re.search(r'(\d+(?:\.\d+)?)', str(qty_balance))
                            if qty_balance_match:
                                qty_balance = float(qty_balance_match.group(1))
                            else:
                                qty_balance = 0.0
                        else:
                            qty_balance = float(qty_balance)
                        
                        if isinstance(quantity, str):
                            quantity_match = re.search(r'(\d+(?:\.\d+)?)', str(quantity))
                            if quantity_match:
                                quantity = float(quantity_match.group(1))
                            else:
                                quantity = 0.0
                        else:
                            quantity = float(quantity)
                        
                        if (actual_qty > qty_balance) or (actual_qty > quantity):
                            return JsonResponse({"error": f"Insufficient Quantity for {po_sl_no}. Requested: {actual_qty}, Available: {qty_balance}"}, status=400)
                    except (ValueError, TypeError) as e:
                        print(f"Error converting balance/quantity for {po_sl_no}: {str(e)}")
                        return JsonResponse({"error": f"Error validating quantities for {po_sl_no}: {str(e)}"}, status=400)
                else:
                    return JsonResponse({"error": f"Invalid Quantity for {po_sl_no}"}, status=400)
                    
            except (ValueError, TypeError) as e:
                print(f"Error processing quantity for {po_sl_no}: {str(e)}")
                return JsonResponse({"error": f"Invalid quantity format for {po_sl_no}: {str(e)}"}, status=400)
    except Exception as e:
        print(f"Error in quantity processing loop: {str(e)}")
        return JsonResponse({"error": f"Error processing quantities: {str(e)}"}, status=500)
    
    # Calculate main kit totals from components and add main kits to dataframe
    if kit_components:  # Only process if there are kit components
        print(f"Processing kit components: {kit_components}")
        try:
            for main_kit_po_sl_no, component_list in kit_components.items():
                print(f"Processing main kit {main_kit_po_sl_no} with components: {component_list}")
                total_qty = 0
                for component_po_sl_no in component_list:
                    # Find the component in the dataframe
                    component_row = df_inw[df_inw['po_sl_no'] == component_po_sl_no]
                    if not component_row.empty:
                        try:
                            component_qty_raw = component_row.iloc[0]['qty_tobe_del']
                            
                            # Extract numeric value from component_qty (handle cases like '5 Ltr')
                            if isinstance(component_qty_raw, str):
                                # Try to extract the first number from the string
                                import re
                                numeric_match = re.search(r'(\d+(?:\.\d+)?)', str(component_qty_raw))
                                if numeric_match:
                                    component_qty = float(numeric_match.group(1))
                                else:
                                    print(f"Could not extract numeric value from '{component_qty_raw}' for kit component {component_po_sl_no}")
                                    return JsonResponse({"error": f"Could not extract numeric value from quantity '{component_qty_raw}' for kit component {component_po_sl_no}"}, status=400)
                            else:
                                component_qty = float(component_qty_raw)
                            
                            total_qty += component_qty
                            print(f"Added component {component_po_sl_no}: {component_qty}, total now: {total_qty}")
                        except (ValueError, TypeError) as e:
                            print(f"Error processing kit component {component_po_sl_no}: {str(e)}")
                            return JsonResponse({"error": f"Invalid quantity for kit component {component_po_sl_no}: {str(e)}"}, status=400)
                    else:
                        print(f"Kit component {component_po_sl_no} not found in dataframe")
                        return JsonResponse({"error": f"Kit component {component_po_sl_no} not found in dataframe"}, status=400)
                
                main_kit_totals[main_kit_po_sl_no] = total_qty
                print(f"Total quantity for main kit {main_kit_po_sl_no}: {total_qty}")
                
                # Update the main kit's qty_tobe_del with the sum of kit components
                main_kit_row = df_inw[df_inw['po_sl_no'] == main_kit_po_sl_no]
                if not main_kit_row.empty:
                    # Update existing main kit row with total quantity
                    main_kit_index = main_kit_row.index[0]
                    df_inw.at[main_kit_index, 'qty_tobe_del'] = total_qty
                    print(f"Updated main kit {main_kit_po_sl_no} qty_tobe_del to {total_qty}")
                else:
                    # Add main kit to dataframe if not already present
                    main_kit_db = CustomerPurchaseOrder.objects.filter(
                        pono=po_no, 
                        po_sl_no=main_kit_po_sl_no
                    ).first()
                    
                    if main_kit_db:
                        # Get HSN code for main kit (try to get from components first)
                        main_kit_hsn = ''
                        for component_po_sl_no in component_list:
                            if component_po_sl_no in hsn_dict:
                                main_kit_hsn = hsn_dict[component_po_sl_no]
                                break
                        
                        # Create main kit row with total quantity
                        main_kit_data = {
                            'slno': main_kit_db.slno,
                            'pono': main_kit_db.pono,
                            'podate': main_kit_db.podate,
                            'quote_id': main_kit_db.quote_id,
                            'quote_date': main_kit_db.quote_date,
                            'cust_id': main_kit_db.cust.cust_id if main_kit_db.cust else '',
                            'consignee_id': main_kit_db.consignee_id,
                            'po_sl_no': main_kit_db.po_sl_no,
                            'prod_code': main_kit_db.prod_code,
                            'prod_desc': main_kit_db.prod_desc,
                            'additional_desc': main_kit_db.additional_desc,
                            'pack_size': main_kit_db.pack_size,
                            'quantity': main_kit_db.quantity,
                            'unit_price': main_kit_db.unit_price,
                            'uom': main_kit_db.uom,
                            'hsn_sac': main_kit_db.hsn_sac,
                            'total_price': main_kit_db.total_price,
                            'qty_balance': main_kit_db.qty_balance,
                            'qty_sent': main_kit_db.qty_sent,
                            'delivery_date': main_kit_db.delivery_date,
                            'po_validity': main_kit_db.po_validity,
                            'location': main_kit_db.location,
                            'qty_tobe_del': total_qty,  # Use calculated total
                            'hsn': main_kit_hsn
                        }
                        
                        # Add to dataframe
                        df_inw = pd.concat([df_inw, pd.DataFrame([main_kit_data])], ignore_index=True)
                        
                        # Add batch_coc_quant for main kit
                        batch_coc_quant[main_kit_po_sl_no] = {
                            "batch": [""],
                            "coc": [""],
                            "quantity": [total_qty]
                        }
                        noOfBatches.append(1)
        except Exception as e:
            print(f"Error in kit component processing: {str(e)}")
            return JsonResponse({"error": f"Error processing kit components: {str(e)}"}, status=500)

    state_code = CustomerMaster.objects.filter(cust_id=cust_id).values_list('cust_st_code', flat=True).first()
    
    if not state_code:
        return JsonResponse({"error": "State code not found for the given customer id"}, status=404)
    
    try:
        gst_instance = GstRates.objects.get()
        cgst_r = float(gst_instance.cgst_rate) / 100
        sgst_r = float(gst_instance.sgst_rate) / 100
        igst_r = float(gst_instance.igst_rate) / 100
    except GstRates.DoesNotExist:
        return JsonResponse({"error": "GST Rates not found"}, status=404)
    
    # return JsonResponse({"df_inw": df_inw.to_dict()})
    
    # Helper function to safely convert string quantities to float
    def safe_float_conversion(value):
        if pd.isna(value) or value is None:
            return 0.0
        if isinstance(value, str):
            # Try to extract the first number from the string
            import re
            numeric_match = re.search(r'(\d+(?:\.\d+)?)', str(value))
            if numeric_match:
                return float(numeric_match.group(1))
            else:
                return 0.0
        else:
            return float(value)
    
    # Convert qty_balance and qty_sent to numeric values safely
    df_inw["qty_balance_numeric"] = df_inw["qty_balance"].apply(safe_float_conversion)
    df_inw["qty_sent_numeric"] = df_inw["qty_sent"].apply(safe_float_conversion)
    df_inw["qty_tobe_del_numeric"] = df_inw["qty_tobe_del"].apply(safe_float_conversion)
    
    # Calculate new quantities
    df_inw["qty_sent"] = df_inw["qty_sent_numeric"] + df_inw["qty_tobe_del_numeric"]
    df_inw["qty_balance"] = df_inw["qty_balance_numeric"] - df_inw["qty_tobe_del_numeric"]
    
    # return JsonResponse({"df_inw": df_inw.to_dict()})
    
    # Calculate taxable amount after numeric columns are created
    df_inw["taxable_amt"] = (df_inw["qty_tobe_del_numeric"] * df_inw["unit_price"].astype(float)).round(2)
    
    if gst_exemption:
        if int(state_code) == 29:
            df_inw["cgst_price"] = 0.0
            df_inw["sgst_price"] = 0.0
            df_inw["igst_price"] = 0.0
        else:
            df_inw["cgst_price"] = 0.0
            df_inw["sgst_price"] = 0.0
            df_inw["igst_price"] = 0.0
    else:
        if int(state_code) == 29:
            df_inw["cgst_price"] = (cgst_r * df_inw["taxable_amt"].astype(float)).apply(lambda x: f"{x:.2f}")
            df_inw["sgst_price"] = (sgst_r * df_inw["taxable_amt"].astype(float)).apply(lambda x: f"{x:.2f}")
            df_inw["igst_price"] = 0.0
        else:
            df_inw["cgst_price"] = 0.0
            df_inw["sgst_price"] = 0.0
            df_inw["igst_price"] = (igst_r * df_inw["taxable_amt"].astype(float)).apply(lambda x: f"{x:.2f}")

    # return JsonResponse({"df_inw": df_inw.to_dict()})
    def create_new_df(df_inw, batch_coc_quant, noOfBatches):
        new_rows = []
        slno_first = df_inw.to_dict()['slno'][0]
        
        # Loop through each row in the dataframe
        for index, row in df_inw.iterrows():
            # Duplicate the row based on noOfBatches and add new columns
            for i in range(noOfBatches[index]):
                # print("row ", index ,": \n", row)
                new_row = row.copy()
                new_row['slno'] = slno_first
                new_row['batch_quantity'] = batch_coc_quant[row['po_sl_no']]['quantity'][i]
                new_row['batch_no'] = batch_coc_quant[row['po_sl_no']]['batch'][i]
                new_row['coc'] = batch_coc_quant[row['po_sl_no']]['coc'][i]
                new_rows.append(new_row)
                slno_first+=1
        # Convert new rows to dataframe
        # print(new_rows)
        new_df = pd.DataFrame(new_rows).reset_index(drop=True)

        return new_df

    # Create the new dataframe
    new_df_dict = create_new_df(df_inw, batch_coc_quant, noOfBatches)
    # return JsonResponse(new_df_dict.to_dict())
    
    skip_index = []
    print("other_charges: ", other_charges)
    if freight_charges or insurance_charges or other_charges["value"]:
        i = 0
        if freight_charges:
            i += 1
            skip_index.append(len(new_df_dict) - i)
        if insurance_charges:
            i += 1
            skip_index.append(len(new_df_dict) - i)
        if other_charges:
            i += 1
            skip_index.append(len(new_df_dict) - i)
        print("index: ", i)
        
    for index, row in new_df_dict.iterrows():
        try:
            max_slno = OtwDc.objects.aggregate(Max('sl_no'))['sl_no__max']
            new_slno = max_slno + 1 if max_slno else 1

            cust_instance = CustomerMaster.objects.get(cust_id=row.get('cust_id', ''))

            OtwDc_instance = OtwDc(
                sl_no=new_slno,
                gcn_no=row.get('gcn_no', ''),
                gcn_date=row.get('gcn_date', ''),
                po_no=row.get('pono', ''),
                po_date=row.get('podate', ''),
                consignee_id=row.get('consignee_id', ''),
                po_sl_no=row.get('po_sl_no', ''),
                prod_id=row.get('prod_code', ''),
                prod_desc=row.get('prod_desc', ''),
                additional_desc=row.get('additional_desc', ''),
                # omat=row.get('omat', ''),
                qty_delivered=row.get('qty_tobe_del', ''),
                pack_size=row.get('pack_size', ''),
                unit_price=row.get('unit_price', ''),
                taxable_amt=row.get('taxable_amt', ''),
                cgst_price=row.get('cgst_price', ''),
                sgst_price=row.get('sgst_price', ''),
                igst_price=row.get('igst_price', ''),
                cust= cust_instance,
                # cust=row.get('cust_id', ''),
                hsn_sac=row.get('hsn', ''),
                batch=row.get('batch_no'),
                coc=row.get('coc', ''),
                batch_quantity= row.get('batch_quantity', ''),
                contact_name=contact_name,
                contact_number=contact,
                location=location  # Add location field from frontend
            )
            OtwDc_instance.save()
            print("successfully added ",row.get('po_sl_no', ''))
        except KeyError as e:
            print(f"Missing key in row: {e}")
        except Exception as e:
            print(f"An error occurred: {e}")

        if index not in skip_index:
            try:
                # Skip special charge rows for database updates
                if row['po_sl_no'] in ['fr', 'ins', 'oc']:
                    continue
                    
                record = CustomerPurchaseOrder.objects.get(
                    cust_id=row['cust_id'],
                    pono=row['pono'],
                    po_sl_no=row['po_sl_no']
                )
                
                # Check if this is a main kit product
                is_main_kit = record.prod_code.startswith('KIT') if hasattr(record, 'prod_code') else False
                
                # Update with actual quantity (already calculated with pack_size)
                try:
                    actual_qty = float(row['qty_tobe_del'])
                    
                    if is_main_kit:
                        # For main kit products, skip updating here - will be updated after all components are processed
                        print(f"Skipping main kit {row['po_sl_no']} update - will be processed after components")
                        continue
                    else:
                        # Regular products and kit components: normal calculation
                        record.qty_balance = float(record.qty_balance) - actual_qty
                        record.qty_sent = float(record.qty_sent) + actual_qty
                        print(f"Updated {row['po_sl_no']}: qty_balance={record.qty_balance}, qty_sent={record.qty_sent}")
                    
                    record.save()
                    
                except (ValueError, TypeError) as e:
                    print(f"Error updating quantity for {row['po_sl_no']}: {str(e)}")
                    continue
                
            except ObjectDoesNotExist:
                print(f"Record not found: cust_id={row['cust_id']}, po_sl_no={row['po_sl_no']}")
                continue
            except Exception as e:
                print(f"Error updating record {row['po_sl_no']}: {str(e)}")
                continue

    # Now update main kit products after all components have been processed
    for index, row in df_inw.iterrows():
        if index in skip_index:
            continue
            
        try:
            # Skip special charge rows for database updates
            if row['po_sl_no'] in ['fr', 'ins', 'oc']:
                continue
                
            record = CustomerPurchaseOrder.objects.get(
                cust_id=row['cust_id'],
                pono=row['pono'],
                po_sl_no=row['po_sl_no']
            )
            
            # Check if this is a main kit product
            is_main_kit = record.prod_code.startswith('KIT') if hasattr(record, 'prod_code') else False
            
            if is_main_kit:
                # For main kit products, calculate qty_sent and qty_balance based on kit components
                main_kit_po_sl_no = row['po_sl_no']
                if main_kit_po_sl_no in kit_components:
                    component_list = kit_components[main_kit_po_sl_no]
                    kit_components_qty_sent_sum = 0
                    
                    # Calculate sum of kit components' qty_sent (after they've been updated)
                    for component_po_sl_no in component_list:
                        try:
                            component_record = CustomerPurchaseOrder.objects.get(
                                cust_id=row['cust_id'],
                                pono=row['pono'],
                                po_sl_no=component_po_sl_no
                            )
                            kit_components_qty_sent_sum += float(component_record.qty_sent)
                        except ObjectDoesNotExist:
                            print(f"Kit component record not found: {component_po_sl_no}")
                            continue
                    
                    # Update main kit with sum of kit components' qty_sent
                    record.qty_sent = kit_components_qty_sent_sum
                    record.qty_balance = float(record.qty_balance) - kit_components_qty_sent_sum
                    print(f"Updated main kit {row['po_sl_no']}: qty_balance={record.qty_balance}, qty_sent={record.qty_sent}")
                    record.save()
                else:
                    # Fallback to regular calculation if no kit components found
                    actual_qty = float(row['qty_tobe_del'])
                    record.qty_balance = float(record.qty_balance) - actual_qty
                    record.qty_sent = float(record.qty_sent) + actual_qty
                    print(f"Updated {row['po_sl_no']}: qty_balance={record.qty_balance}, qty_sent={record.qty_sent}")
                    record.save()
                
        except ObjectDoesNotExist:
            print(f"Record not found: cust_id={row['cust_id']}, po_sl_no={row['po_sl_no']}")
            continue
        except Exception as e:
            print(f"Error updating record {row['po_sl_no']}: {str(e)}")
            continue

    GstRates.objects.filter(id=1).update(last_gcn_no=new_gcn_no)

    print("The gcn_num after the invoice generation is: ", new_gcn_no)

    return JsonResponse({"success": True, "gcn_no": new_gcn_no})


@csrf_exempt
def invoice_generation(request):
    if request.method == "GET":
        gcn_no = request.GET.get("gcn_no")  # renamed for clarity
        year = request.GET.get("year")      # expected format: 2024-25

        if not gcn_no or not year:
            return JsonResponse({"error": "Both gcn_no and year are required"}, status=400)

        # Format the gcn_no like 001/2024-25
        gcn_num = f"{str(gcn_no).zfill(3)}/{year}"
        print("Formatted gcn_num:", gcn_num)

        otwdc_values = OtwDc.objects.filter(gcn_no=gcn_num)
        if not otwdc_values.exists():
            return JsonResponse({"error": "No records found for the provided GCN number"}, status=404)

        def model_to_dic(instance):
            # Calculate number of packs by dividing qty_delivered by pack_size (extract numeric part)
            number_of_packs = 0
            try:
                qty_delivered = float(instance.qty_delivered) if instance.qty_delivered else 0
                import re
                pack_size_str = str(instance.pack_size) if instance.pack_size else "1"
                match = re.search(r"(\d+(?:\.\d+)?)", pack_size_str)
                pack_size = float(match.group(1)) if match else 1.0
                if pack_size > 0:
                    number_of_packs = qty_delivered / pack_size
                else:
                    number_of_packs = qty_delivered
            except (ValueError, TypeError):
                number_of_packs = 0

            result = {
                'sl_no': instance.sl_no,
                'gcn_no': instance.gcn_no,
                'gcn_date': str(instance.gcn_date),
                'po_no': instance.po_no,
                'po_date': str(instance.po_date),
                'cust_id': instance.cust.cust_id if instance.cust else '',
                'consignee_id': instance.consignee_id,
                'prod_id': instance.prod_id,
                'po_sl_no': instance.po_sl_no,
                'prod_desc': instance.prod_desc,
                'additional_desc': instance.additional_desc,
                'hsn': instance.hsn_sac,
                'batch': instance.batch,
                'coc': instance.coc,
                'qty_delivered': instance.qty_delivered,
                'number_of_packs': round(number_of_packs, 2),  # Add number of packs field
                'pack_size': instance.pack_size,
                'unit_price': instance.unit_price,
                'taxable_amt': instance.taxable_amt,
                'cgst_price': instance.cgst_price,
                'sgst_price': instance.sgst_price,
                'igst_price': instance.igst_price,
                'contact_name': instance.contact_name,
                'batch_quantity': instance.batch_quantity,
                'location': instance.location  # Add location to response
            }
            print(f"Debug - {instance.po_sl_no}: qty_delivered={instance.qty_delivered}, pack_size={instance.pack_size}, number_of_packs={round(number_of_packs, 2)}")
            return result

        otwdc_result = [model_to_dic(otwdc_value) for otwdc_value in otwdc_values]

        # Keep unique po_sl_no entries only
        unique_po_sl_no = {}
        for item in otwdc_result:
            if item['po_sl_no'] not in unique_po_sl_no:
                unique_po_sl_no[item['po_sl_no']] = item

        inv_result = list(unique_po_sl_no.values())
        
        # Ensure inv_result also has number_of_packs field
        for inv_item in inv_result:
            # Find corresponding item in otwdc_result to get number_of_packs
            for otwdc_item in otwdc_result:
                if otwdc_item['po_sl_no'] == inv_item['po_sl_no']:
                    inv_item['number_of_packs'] = otwdc_item.get('number_of_packs', 0)
                    print(f"Debug - Added number_of_packs to inv_result for {inv_item['po_sl_no']}: {otwdc_item.get('number_of_packs', 0)}")
                    break
        
        # For main kit products, calculate number_of_packs as sum of kit components
        for inv_item in inv_result:
            # Check if this is a main kit product (po_sl_no doesn't contain a dot)
            po_sl_no = inv_item['po_sl_no']
            if '.' not in po_sl_no and po_sl_no not in ['fr', 'ins', 'oc']:
                # Find all kit components for this main kit (po_sl_no with dots)
                kit_components_number_of_packs_sum = 0
                for otwdc_item in otwdc_result:
                    if otwdc_item['po_sl_no'].startswith(po_sl_no + '.') or otwdc_item['po_sl_no'] == po_sl_no + '.1' or otwdc_item['po_sl_no'] == po_sl_no + '.2':
                        kit_components_number_of_packs_sum += otwdc_item.get('number_of_packs', 0)
                
                # Update main kit with sum of kit components' number_of_packs
                if kit_components_number_of_packs_sum > 0:
                    inv_item['number_of_packs'] = kit_components_number_of_packs_sum
                    print(f"Debug - Updated main kit {po_sl_no} number_of_packs to sum of components: {kit_components_number_of_packs_sum}")
            
            # Ensure kit components have unit_price = 0
            if '.' in po_sl_no:
                inv_item['unit_price'] = 0
                inv_item['taxable_amt'] = 0
                print(f"Debug - Set unit_price and taxable_amt to 0 for kit component {po_sl_no}")
        
        odc1 = otwdc_values.first()

        # Filter out unwanted po_sl_no
        unwanted_po_sl_no = ("fr", "ins", "oc")
        final_otwdc = [otwdc for otwdc in otwdc_result if otwdc['po_sl_no'] not in unwanted_po_sl_no]

        r = get_object_or_404(CustomerMaster, cust_id=odc1.cust.cust_id if odc1.cust else '')
        c = get_object_or_404(CustomerMaster, cust_id=odc1.consignee_id)
        gst_rate = get_object_or_404(GstRates, id=1)

        # Calculate total number of packs instead of total quantity
        total_number_of_packs = sum(item.get('number_of_packs', 0) for item in final_otwdc)
        total_taxable_value = sum(item['taxable_amt'] for item in inv_result)
        total_cgst = sum(item['cgst_price'] for item in inv_result)
        total_sgst = sum(item['sgst_price'] for item in inv_result)
        total_igst = sum(item['igst_price'] for item in inv_result)

        grand_total = round(total_taxable_value + total_cgst + total_sgst + total_igst)
        gt = format_currency(grand_total, 'INR', locale='en_IN')
        aw = convert_rupees_to_words(grand_total)

        context = {
            'inv': inv_result,
            'odc': final_otwdc,
            'r': model_to_dict(r),
            'c': model_to_dict(c),
            'gr': model_to_dict(gst_rate),
            'odc1': model_to_dict(odc1),
            'amount': aw,
            'total_taxable_value': "{:.2f}".format(total_taxable_value),
            'total_cgst': "{:.2f}".format(total_cgst),
            'total_sgst': "{:.2f}".format(total_sgst),
            'total_igst': "{:.2f}".format(total_igst),
            'gt': gt,
            'total_qty': total_number_of_packs  # Use total number of packs instead of total quantity
        }
        
        # Debug: Print the first item to see if number_of_packs is included
        if final_otwdc:
            print(f"Debug - First item in final_otwdc: {final_otwdc[0]}")
            print(f"Debug - number_of_packs: {final_otwdc[0].get('number_of_packs')}")
            print(f"Debug - qty_delivered: {final_otwdc[0].get('qty_delivered')}")
        
        # Debug: Print inv_result structure
        if inv_result:
            print(f"Debug - First item in inv_result: {inv_result[0]}")
            print(f"Debug - inv_result number_of_packs: {inv_result[0].get('number_of_packs')}")
            print(f"Debug - inv_result qty_delivered: {inv_result[0].get('qty_delivered')}")
        
        return JsonResponse({"message": "success", "inv_result": inv_result, "context": context}, safe=False)
    else:
        return JsonResponse({"error": "Only GET requests are allowed"}, status=405)
    
def get_contact_names(request):
    if request.method == 'GET':
        try:
            consigneeId = request.GET.get("consigneeId")
            contact = CustomerMaster.objects.filter(cust_id=consigneeId).values()
            if contact.exists():
                contact_names = [   
                    contact[0].get('contact_name_1'),
                    contact[0].get('contact_name_2')
                ]
            else:
                contact_names = [None, None]
            return JsonResponse({"contactNames": contact_names})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

def get_invoice_data(request):
    if request.method == 'GET': 
        try:
            po_no = request.GET.get("poNo")
            if po_no:
                result = CustomerPurchaseOrder.objects.filter(pono=po_no)
                result_first = result.first()   
                
                if not result_first:
                    return JsonResponse({"error": "No matching CustomerPurchaseOrder found"}, status=404)
                
                contact = CustomerMaster.objects.filter(cust_id=result_first.consignee_id).values()
                
                if contact.exists():
                    contact_names = [   
                        contact[0].get('contact_name_1'),
                        contact[0].get('contact_name_2')
                    ]
                else:
                    contact_names = [None, None]
                    
                print('contact: ', contact_names)
                
                cust_id = result_first.cust.cust_id if result_first.cust else ''
                consignee_id = result_first.consignee_id
                invoice_header_data = {
                    'customerId': cust_id,
                    'consigneeId': consignee_id,
                    'contact_names': contact_names
                }
                
                # Serialize the result queryset to a list of dictionaries
                result_data = list(result.values())
                
                result_data = list(result.values())
                filtered_result_data = [
                    {
                        'poNo': item['pono'],
                        'po_sl_no': item['po_sl_no'],
                        'unit_price': item['unit_price'],
                        'prod_code': item['prod_code'],
                        'prod_desc': item['prod_desc'], 
                        'hsnSac': item['hsn_sac'],
                        'qty_balance': item['qty_balance'],
                        'pack_size': item.get('pack_size', ''),
                        'location': item.get('location', 'HBL')
                    }
                    for item in result_data
                ]
                return JsonResponse({"success": True, "invoice_header_data": invoice_header_data, "result": filtered_result_data})
            else:
                return JsonResponse({"error": "po_no parameter is missing"}, status=400)
        except ObjectDoesNotExist:
            return JsonResponse({"error": "Object does not exist"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only GET requests are allowed"}, status=405)

@api_view(["GET"])
def get_state_data(request):
    try:
        print('entered')
        state_data = GstStateCode.objects.all().values().order_by('state_name')
        return JsonResponse({"success": True, "state_data": list(state_data)})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

@api_view(["GET"])
def get_customer_data(request):
    try:
        print('entered')
        customer_data = CustomerMaster.objects.all().values().order_by('cust_id')
        return JsonResponse({"success": True, "customerData": list(customer_data)})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
    
@api_view(["GET"])
def get_purchase_order(request):
    try:
        print('entered')
        # state_data = CustomerPurchaseOrder.objects.all().distinct().values()
        distinct_pono = list(CustomerPurchaseOrder.objects.values('pono').distinct().order_by('pono'))
        return JsonResponse({"success": True, "distinct_pono": distinct_pono})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
    
@api_view(["GET"])
def get_product_data(request):
    try:
        print('entered')
        product_data = SupplierProductMaster.objects.all().values()
        return JsonResponse({"success": True, "products": list(product_data)})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
    
def get_product_codes(request):
    try:
        product_codes = SupplierProductMaster.objects.values("prod_id")
        return JsonResponse({"success": True, "prod_code": list(product_codes)})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
def invoice_report(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            start_date_str = data.get('startDate')
            end_date_str = data.get('endDate')

            start_datetime = datetime.strptime(start_date_str, "%d-%m-%Y")
            end_datetime = datetime.strptime(end_date_str, "%d-%m-%Y")
            start_date = start_datetime.date()
            end_date = end_datetime.date()

            # Fetch and filter data from the database

            #---------------------------------------- TJ ---------------------------------------
            # Changed batch_quantity to qty_delivered, and added po_sl_no to identify duplicates
            
            # result = OtwDc.objects.filter(gcn_date__range=(start_date, end_date))\
            #                       .exclude(taxable_amt=0)\
            #                       .exclude(po_sl_no__in=['oc','ins','fr'])\
            #                       .exclude(po_sl_no__regex=r'\.')\
            #                       .select_related('cust_id')\
            #                       .values('gcn_no', 'gcn_date', 'batch_quantity',
            #                               'taxable_amt', 'cgst_price', 'sgst_price', 'igst_price',
            #                               'cust_id__cust_name', 'cust_id__cust_gst_id', 'hsn_sac')\
            #                       .order_by('gcn_date')

            # # Create DataFrame
            # df = pd.DataFrame(result)

            # # Reformat DataFrame
            # df = df[['cust_id__cust_name', 'cust_id__cust_gst_id', 'gcn_no', 'gcn_date', 'hsn_sac',
            #          'batch_quantity', 'taxable_amt', 'cgst_price', 'sgst_price', 'igst_price']]
            # df.insert(0, 'Sl No', range(1, len(df) + 1))
            # 
            result = OtwDc.objects.filter(gcn_date__range=(start_date, end_date))\
                                   .exclude(taxable_amt=0)\
                                   .exclude(po_sl_no__regex=r'\.')\
                                   .select_related('cust_id')\
                                   .values('cust_id','gcn_no', 'gcn_date', 'po_sl_no', 'qty_delivered',
                                           'taxable_amt', 'cgst_price', 'sgst_price', 'igst_price',
                                           'cust_id__cust_name', 'cust_id__cust_gst_id', 'hsn_sac')\
                                   .order_by('gcn_date')

            # Create DataFrame
            df = pd.DataFrame(result)

            # Deleting duplicate po_sl_no rows for same gcn_no to keep only one batch_no record
            df.drop_duplicates(subset=['gcn_no', 'gcn_date', 'po_sl_no', 'qty_delivered', 'taxable_amt'], keep='first', inplace=True)

            # Setting qty_delivered = 0 for po_sl_no ('oc','fr','ins') and then dropping column po_sl_no
            df.loc[df['po_sl_no'].isin(['oc','fr','ins']), 'qty_delivered'] = 0
            df.drop(columns = ['po_sl_no'],inplace=True)

            # Reformat DataFrame
            df = df[['cust_id','cust_id__cust_name', 'cust_id__cust_gst_id', 'gcn_no', 'gcn_date', 'hsn_sac',
                     'qty_delivered', 'taxable_amt', 'cgst_price', 'sgst_price', 'igst_price']]
            df.insert(0, 'Sl No', range(1, len(df) + 1))

            # Reformat the 'gcn_date' into a readable string format
            df['gcn_date'] = pd.to_datetime(df['gcn_date']).dt.strftime('%d-%m-%Y')
            df = df.rename(columns={
                'cust_id': 'Cust-ID',
                'gcn_no': 'Invoice Number',
                'gcn_date': 'Invoice Date',
                'hsn_sac': 'HSN/SAC',
                'qty_delivered': 'Quantity',
                'taxable_amt': 'Ass.Value',
                'cgst_price': 'CGST Price (9%)',
                'sgst_price': 'SGST Price (9%)',
                'igst_price': 'IGST Price (18%)',
                'cust_id__cust_name': 'Customer Name',
                'cust_id__cust_gst_id': 'Customer GST IN',
            })
            #------------------------------------------------------------------------------------------

            df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce')

            # Group data according to specific criteria
            grouped = df.groupby(['Invoice Number', 'Invoice Date', 'HSN/SAC']).agg({
                'Quantity': 'sum',
                'Ass.Value': 'sum',
                'CGST Price (9%)': 'sum',
                'SGST Price (9%)': 'sum',
                'IGST Price (18%)': 'sum'
            }).reset_index()

            grouped2 = df.groupby(['Invoice Number', 'Invoice Date']).agg({
                'Quantity': 'sum',
                'Ass.Value': 'sum',
                'CGST Price (9%)': 'sum',
                'SGST Price (9%)': 'sum',
                'IGST Price (18%)': 'sum'
            }).reset_index()

            df1 = df[['Invoice Number', 'Cust-ID', 'Customer Name', 'Customer GST IN', 'HSN/SAC']].drop_duplicates()
            df2 = df[['Invoice Number', 'Cust-ID', 'Customer Name', 'Customer GST IN']].drop_duplicates()

            df1['Customer GST IN'] = df1['Customer GST IN'].fillna('')
            df2['Customer GST IN'] = df2['Customer GST IN'].fillna('')

            df1 = df1.sort_values(by="Invoice Number", ascending=True)
            df2 = df2.sort_values(by="Invoice Number", ascending=True)

            combined_df = pd.merge(df1, grouped, on=['Invoice Number', 'HSN/SAC'], how='left')
            combined_df2 = pd.merge(df2, grouped2, on=['Invoice Number'], how='left')

            combined_df['Sl No'] = range(1, len(combined_df) + 1)
            combined_df2['Sl No'] = range(1, len(combined_df2) + 1)

            total_taxable_amt = grouped['Ass.Value'].sum()
            total_cgst_price = grouped['CGST Price (9%)'].sum()
            total_sgst_price = grouped['SGST Price (9%)'].sum()
            total_igst_price = grouped['IGST Price (18%)'].sum()

            total_taxable_amt2 = grouped2['Ass.Value'].sum()
            total_cgst_price2 = grouped2['CGST Price (9%)'].sum()
            total_sgst_price2 = grouped2['SGST Price (9%)'].sum()
            total_igst_price2 = grouped2['IGST Price (18%)'].sum()

            total_row = pd.DataFrame({
                'Sl No': 'Total',
                'Cust_ID': '',
                'Customer Name': '',
                'Customer GST IN': '',
                'Invoice Date': '',
                'Invoice Number': '',
                'HSN/SAC': '',
                'Quantity': '',
                'Ass.Value': total_taxable_amt.round(2),
                'CGST Price (9%)': total_cgst_price,
                'SGST Price (9%)': total_sgst_price,
                'IGST Price (18%)': total_igst_price,
                'Round Off': '',
            }, index=[0])

            total_row2 = pd.DataFrame({
                'Sl No': 'Total',
                'Cust-ID': '',
                'Customer Name': '',
                'Customer GST IN': '',
                'Invoice Date': '',
                'Invoice Number': '',
                'HSN/SAC': '',
                'Quantity': '',
                'Ass.Value': total_taxable_amt2,
                'CGST Price (9%)': total_cgst_price2,
                'SGST Price (9%)': total_sgst_price2,
                'IGST Price (18%)': total_igst_price2,
                'Round Off': '',
            }, index=[0])

            combined_df = pd.concat([combined_df, total_row], ignore_index=True)
            combined_df2 = pd.concat([combined_df2, total_row2], ignore_index=True)

            # return JsonResponse({'result': combined_df.to_dict()})

            combined_df['Invoice Value'] = combined_df['Ass.Value'] + combined_df['IGST Price (18%)'] + combined_df['CGST Price (9%)'] + combined_df['SGST Price (9%)']
            combined_df['Invoice Value'] = pd.to_numeric(combined_df['Invoice Value']).round()
            combined_df2['Invoice Value'] = combined_df2['Ass.Value'] + combined_df2['IGST Price (18%)'] + combined_df2['CGST Price (9%)'] + combined_df2['SGST Price (9%)']
            combined_df2['Invoice Value'] = pd.to_numeric(combined_df2['Invoice Value']).round()

            combined_df['Round Off'] = combined_df.apply(
                lambda row: float(row['Invoice Value']) - (
                    float(row['Ass.Value']) +
                    float(row['IGST Price (18%)']) +
                    float(row['CGST Price (9%)']) +
                    float(row['SGST Price (9%)'])
                ) if row['Sl No'] != 'Total' else None,
                axis=1
            )
            combined_df2['Round Off'] = combined_df2.apply(
                lambda row: float(row['Invoice Value']) - (
                    float(row['Ass.Value']) +
                    float(row['IGST Price (18%)']) +
                    float(row['CGST Price (9%)']) +
                    float(row['SGST Price (9%)'])
                ) if row['Sl No'] != 'Total' else None,
                axis=1
            )

            # Convert numeric columns to appropriate types without formatting
            numeric_columns = ['Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']
            combined_df[numeric_columns] = combined_df[numeric_columns].apply(pd.to_numeric, errors='coerce')
            combined_df2[numeric_columns] = combined_df2[numeric_columns].apply(pd.to_numeric, errors='coerce')

            combined_df.loc[combined_df['Sl No'] == 'Total', ['Round Off', 'HSN/SAC']] = ''
            combined_df2.loc[combined_df2['Sl No'] == 'Total', ['Round Off', 'HSN/SAC']] = ''

            column_order = ['Sl No', 'Cust-ID', 'Customer Name', 'Customer GST IN', 'Invoice Number', 'Invoice Date', 'HSN/SAC', 'Quantity', 'Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']
            combined_df = combined_df[column_order]
            combined_df2 = combined_df2[column_order]

            combined_df2['HSN/SAC'] = combined_df2['HSN/SAC'].fillna('')

            # Convert to JSON
            json_data = combined_df.to_json(orient='records')
            json_data2 = combined_df2.to_json(orient='records')

            return JsonResponse({"data": json.loads(json_data), "data2": json.loads(json_data2)}, safe=False)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

PASSWORD_REGEX = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'

@api_view(['POST'])
def signup(request):
    # Validate password strength
    password = request.data.get('password', '')
    if not re.match(PASSWORD_REGEX, password):
        return Response(
            {
                "password": [
                    "Password must be at least 8 characters long and include "
                    "uppercase, lowercase, number, and special character."
                ]
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate and save user
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        user = User.objects.get(username=request.data['username'])
        user.set_password(password)
        user.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# @api_view(['POST'])
# def login(request):
#     # user = get_object_or_404(User, username=request.data['username'])
#     user = User.objects.get(username=request.data['username'])
#     print("user: ", user)
#     if not user.check_password(request.data['password']):
#         return Response("Invalid username or password", status=status.HTTP_404_NOT_FOUND)
    
#     # Check if the user is already logged in
#     # if user.is_active:
#     #     return JsonResponse({"error": "User is already Logged In", "status": status.HTTP_400_BAD_REQUEST })
#     #     return Response("User is already logged in", status=status.HTTP_400_BAD_REQUEST)
#     # Proceed with login
#     token, created = Token.objects.get_or_create(user=user)
#     serializer = UserSerializer(user)
    
#     # Update the `logged_in` field to `True`
#     # user.is_active = 1
#     user.save()

#     return Response({'token': token.key, 'user': serializer.data})

@api_view(['POST'])
def login(request):
    try:
        user = User.objects.get(username=request.data['username'])
        print("user: ", user)
    except User.DoesNotExist:
        return Response("Invalid username or password", status=status.HTTP_404_NOT_FOUND)

    if not user.check_password(request.data['password']):
        return Response("Invalid username or password", status=status.HTTP_404_NOT_FOUND)

    # Proceed with login
    token, created = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)

    # Fetch user permissions
    user_permissions = user.user_permissions.values_list('codename', flat=True)

    # Add permissions to the response
    response_data = {
        'token': token.key,
        'user': serializer.data,
        'permissions': list(user_permissions),  # Convert to list for JSON serialization
    }

    return Response(response_data)

@api_view(['DELETE'])
def delete_user(request):
    username = request.data.get('username', None)
    
    if not username:
        return Response(
            {"error": "Username is required to delete a user."},
            status=status.HTTP_400_BAD_REQUEST
        )
     
    try:
        # Retrieve the user by username
        user = User.objects.get(username=username)
        
        # Delete the associated token
        Token.objects.filter(user=user).delete()
        
        # Delete the user
        user.delete()
        
        return Response(
            {"message": f"User '{username}' has been successfully deleted."},
            status=status.HTTP_200_OK
        )
    except User.DoesNotExist:
        return Response(
            {"error": f"User '{username}' does not exist."},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@authentication_classes([SessionAuthentication, TokenAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    token = request.GET.get("token")
    user = request.GET.get("user")
    # return Response("passed!", {token: token, valid: True})
    return JsonResponse({"valid": True, "token": token, "user": user})

@api_view(['POST'])
@authentication_classes([SessionAuthentication, TokenAuthentication])
@permission_classes([IsAuthenticated])  # Allow any authenticated user to log out
def logout(request):
    print(f"Authenticated user: {request.user}")
    
    # if not request.user.is_authenticated:
    #     return Response("User not authenticated", status=status.HTTP_403_FORBIDDEN)
    
    # Attempt to delete the token if it exists
    try:
        token = Token.objects.get(user=request.user)
        token.delete()  # Remove token for the user
    except Token.DoesNotExist:
        pass  # Token does not exist, which might be okay

    # Optionally, deactivate the user if you want, otherwise skip
    # request.user.is_active = False
    # request.user.save()

    # Log out the user (destroy session or remove token)
    return Response("Logged out successfully!", status=status.HTTP_200_OK)

def getAllFinalPo(request):
    pono=request.GET.get('pono')
    try:
        # data = list(FinalPo.objects.filter(pono=pono).values())
        data = list(FinalPo.objects.all().values())
        if not data:
            return JsonResponse({"error": "No data found for the given pono"}, status=404)
        return JsonResponse({"data": data})
    except Exception as e:
        return JsonResponse({"error": "An error occurred while fetching data"}, status=500)

def postFinalPo(request):
    return

def updateFinalPo(request):
    return

def update_user_status(request):
    if request.method == 'POST':
        # Update user status to inactive
        request.user.is_active = 0
        request.user.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'failed'}, status=400)

def print_invoice_page_data(request):
    # if request.method == 'GET':
    gst_rates = GstRates.objects.all()

    return JsonResponse({'gst_rates': gst_rates.values()[0]})


"""
Outstanding Purchase Orders API Endpoint
--------------------------------------

Technical Note:
    All numeric values are returned as strings (e.g., "100.00" instead of 100) to maintain
    exact decimal representation during JSON serialization. This ensures consistent display
    of decimal places, as JSON doesn't preserve trailing zeros during number serialization.
"""

@csrf_exempt
def outstanding_PO(request):
    def format_number(value):
        """Format number to always show 2 decimal places as string"""
        return '{:.2f}'.format(float(value))

    try:
        if request.method == 'GET':
            # Get query parameters
            from_date = request.GET.get("from_date")
            to_date = request.GET.get("to_date")
            cust_id = request.GET.get("cust_id")

            # Validate the date format
            try:
                from_date = datetime.strptime(from_date, '%d-%m-%Y')
                to_date = datetime.strptime(to_date, '%d-%m-%Y')
            except ValueError:
                return JsonResponse({'error': 'Invalid date format. Use DD-MM-YYYY'}, status=400)

            # Build the filter conditions
            filter_conditions = {
            #    'podate__range': (from_date, to_date),
            #    'qty_balance__gt': 0
                'podate__range': (from_date, to_date),
            }

            # If cust_id is provided, add it to the filter conditions
            if cust_id:
                filter_conditions['cust__cust_id'] = cust_id

            # Filter the data based on the conditions
            purchase_orders = CustomerPurchaseOrder.objects.filter(**filter_conditions)

            # Initialize totals
            total_realised_value = 0
            total_outstanding_value = 0

            # Prepare the data to return
            data = []
            for index, po in enumerate(purchase_orders, start=1):
                # Calculate values
                realised_value = float(po.unit_price * po.qty_sent)
                outstanding_value = float(po.unit_price * po.qty_balance)

                total_realised_value += realised_value
                total_outstanding_value += outstanding_value

                data.append({
                    'Sl. No.': index,  # Keep as integer
                    'Cust ID': po.cust.cust_id if po.cust else '',
                    'Customer Name': po.cust.cust_name,
                    'PO No.': po.pono,
                    'PO Date': po.podate.strftime('%d-%m-%Y'),
                    'PO Sl. No.': po.po_sl_no,
                    'Product Code': po.prod_code,
                    'Pack Size': po.pack_size,
                    'Unit Price': format_number(po.unit_price),
                    'Total Quantity': format_number(po.quantity),
                    'Quantity Sent': format_number(po.qty_sent),
                    'Realised Value': format_number(realised_value),
                    'Quantity Balance': format_number(po.qty_balance),
                    'Outstanding Value': format_number(outstanding_value)
                })

            # Add a new row for the totals
            data.append({
                'Sl. No.': 'Total',
                'Cust ID': '',
                'Customer Name': '',
                'PO No.': '',
                'PO Date': '',
                'PO Sl. No.': '',
                'Product Code': '',
                'Pack Size': '',
                'Unit Price': '',
                'Total Quantity': '',
                'Quantity Sent': '',
                'Realised Value': format_number(total_realised_value),
                'Quantity Balance': '',
                'Outstanding Value': format_number(total_outstanding_value)
            })

            return JsonResponse({'purchase_order': data}, status=200)

        # Return an error response for unsupported methods
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)