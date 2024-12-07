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
from decimal import Decimal, ROUND_DOWN
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

                    unit_price = round_decimal(product.get('unitPrice', 0))
                    total_price = round_decimal(product.get('totalPrice', 0))

                    order = CustomerPurchaseOrder(
                        slno=new_slno,
                        pono=formData.get('poNo'),
                        podate=formData.get('poDate'),
                        quote_id=formData.get('quoteId'),
                        quote_date=formData.get('poValidity'),
                        customer_id=formData.get('customerId'),
                        consignee_id=formData.get('consigneeId'),
                        po_sl_no=product.get('poSlNo'),
                        prod_code=product.get('prodId'),
                        prod_desc=product.get('productDesc'),
                        additional_desc=product.get('msrr'),
                        hsn_sac=product.get('hsn_sac'),
                        pack_size=product.get('packSize'),
                        quantity=product.get('quantity'),
                        unit_price=unit_price,
                        uom=product.get('uom'),
                        total_price=total_price,
                        qty_sent=0.00,
                        qty_balance=product.get('quantity'),
                        delivery_date=delivery_date,
                        po_validity=formData.get('poValidity'),
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
                print(filtered_data_dicts)
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
                data = list(CustomerPurchaseOrder.objects.filter(customer_id=cust_id, pono=po_no, po_sl_no=po_sl_no).order_by('po_sl_no').values())
                po_nos = CustomerPurchaseOrder.objects.filter(pono=po_no).values_list('po_sl_no', flat=True).order_by('po_sl_no')
                filtered_po_sl_nos = [no for no in po_nos if no.startswith(po_sl_no + ".")]
                filtered_data = CustomerPurchaseOrder.objects.filter(pono=po_no, po_sl_no__in=filtered_po_sl_nos)
                print(filtered_data)
                filtered_data_dicts = [model_to_dict(item) for item in filtered_data]
                print(filtered_data_dicts)
                total_sum = CustomerPurchaseOrder.objects.filter(pono=po_no).aggregate(total_sum=Sum('total_price'))['total_sum']
                return JsonResponse({"success": True, "data": data, "filtered_data": filtered_data_dicts, "total_sum": total_sum})
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

@csrf_exempt
def update_purchase_order(request):
    if request.method == 'PUT':
        try:
            data = request.body.decode('utf-8')
            result = json.loads(data)
            print('result:', result)

            search_inputs = result.get('searchData', {})
            cust_id = search_inputs.get('customer_id')
            po_no = search_inputs.get('pono')
            po_sl_no = search_inputs.get('po_sl_no')

            kit_data = result.get('kitData', [])
            # Print statement to debug `kit_data`
            print('Kit data:', kit_data)

            if not all([cust_id, po_no, po_sl_no]):
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            # Fetch the record to update
            record = CustomerPurchaseOrder.objects.get(customer_id=cust_id, pono=po_no, po_sl_no=po_sl_no)

            # Update the record with new values from searchData
            search_data = result.get('searchData', {})
            search_data['podate'] = convert_date_format(search_data.get('podate')) if search_data.get('podate') else None
            search_data['po_validity'] = convert_date_format(search_data.get('po_validity')) if search_data.get('po_validity') else None
            search_data['delivery_date'] = convert_date_format(search_data.get('delivery_date')) if search_data.get('delivery_date') else None

            for key, value in search_data.items():
                if hasattr(record, key):
                    setattr(record, key, value)
                else:
                    print(f"Invalid key in searchData: {key}")

            record.save()

            # Update kitData records
            for kit_item in kit_data:
                kit_cust_id = kit_item.get('customer_id')
                kit_po_no = kit_item.get('pono')
                kit_po_sl_no = kit_item.get('po_sl_no')

                # Print statements to debug each kit item
                print('Processing kit item:', kit_item)
                print(f'kit_cust_id: {kit_cust_id}, kit_po_no: {kit_po_no}, kit_po_sl_no: {kit_po_sl_no}')

                if not all([kit_cust_id, kit_po_no, kit_po_sl_no]):
                    continue

                try:
                    # Fetch the kit record to update
                    kit_record = CustomerPurchaseOrder.objects.get(customer_id=kit_cust_id, pono=kit_po_no, po_sl_no=kit_po_sl_no)

                    # Update the kit record with new values from kitData
                    for key, value in kit_item.items():
                        if hasattr(kit_record, key):
                            setattr(kit_record, key, value)
                        else:
                            print({"error": "Invalid key in kitData: {key}"})

                    kit_record.save()
                except CustomerPurchaseOrder.DoesNotExist:
                    return JsonResponse(f"Kit record with po_sl_no {kit_po_sl_no} not found")

            return JsonResponse({'success': True})
        except CustomerPurchaseOrder.DoesNotExist:
            return JsonResponse({'error': 'Record not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
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
    data = json.loads(request.body.decode('utf-8'))

    print("data: ", data)

    po_no = data['formData2'].get('poNo').strip()
    cust_id = data['formData2'].get('customerId')
    new_cons_id = data['formData2'].get('newConsigneeName', '')
    contact_name = data['formData2'].get('contactName')
    freight_charges = data['formData2'].get('freightCharges')
    insurance_charges = data['formData2'].get('insuranceCharges')
    other_charges = data['formData2'].get('otherCharges')

    print("other_charges: ", other_charges  )

    contact_nums = CustomerMaster.objects.filter(cust_id=cust_id).values().first()
    print(contact_nums)
    gst_exemption = contact_nums['gst_exemption']
    if not contact_nums:
        return JsonResponse({"error": "Customer not found"}, status=404)
    contact = contact_nums['contact_phone_1'] if contact_nums['contact_name_1'] == contact_name else contact_nums['contact_phone_2']
    

    po_sl_numbers = []
    qty_tobe_del = []
    hsn = []
    noOfBatches = []
    batch_coc_quant = dict()

    for item in data['formData2']['items']:
        po_sl_numbers.append(item['poSlNo'])
        qty_tobe_del.append(item['quantities'])
        hsn.append(item['hsnSac'])
        noOfBatches.append(item['noOfBatches'])
        batch_coc_quant[item['poSlNo']] = item['batch_coc_quant']
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
    # print(data_inw.query)
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
            'customer_id': '',
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
            'customer_id': '',
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
            'customer_id': '',
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
        hsn.append('')
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

    if fin_year < current_yyyy and current_mm > 3:
        fin_year = current_yyyy
        GstRates.objects.filter(id=1).update(fin_yr=fin_year, last_gcn_no=0)
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
    df_inw["consignee_id"] = cust_id if new_cons_id == '' else new_cons_id
    # return JsonResponse({"df_inw": df_inw.to_dict()})

    qty_dict = dict(zip(po_sl_numbers, qty_tobe_del))
    hsn_dict = dict(zip(po_sl_numbers, hsn))
    df_inw['qty_tobe_del'] = df_inw['po_sl_no'].map(qty_dict)
    df_inw['hsn'] = df_inw['po_sl_no'].map(hsn_dict)

    for index, row in df_inw.iterrows():
        qty_tobe_del = row['qty_tobe_del']
        qty_balance = row['qty_balance']
        quantity = row['quantity']

        if qty_tobe_del is not None and qty_balance is not None and quantity is not None:
            if (float(qty_tobe_del) > float(qty_balance)) or (float(qty_tobe_del) > float(quantity)):
                return JsonResponse({"error": "Insufficient Quantity"}, status=400)
        else:
            return JsonResponse({"error": "Quantity information missing"}, status=400)

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
    
    df_inw["taxable_amt"] = (df_inw["qty_tobe_del"].astype(float) * df_inw["unit_price"].astype(float)).round(2)
    
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


    df_inw["qty_sent"] = df_inw["qty_sent"].astype(float) + df_inw["qty_tobe_del"].astype(float)
    df_inw["qty_balance"] = df_inw["qty_balance"].astype(float) - df_inw["qty_tobe_del"].astype(float)
    
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
                cust_id=row.get('cust_id', ''),
                hsn_sac=row.get('hsn', ''),
                batch=row.get('batch_no'),
                coc=row.get('coc', ''),
                batch_quantity= row.get('batch_quantity', ''),
                contact_name=contact_name,
                contact_number=contact
            )
            OtwDc_instance.save()
            print("successfully added ",row.get('po_sl_no', ''))
        except KeyError as e:
            print(f"Missing key in row: {e}")
        except Exception as e:
            print(f"An error occurred: {e}")

        if index not in skip_index:
            try:
                record = CustomerPurchaseOrder.objects.get(
                    customer_id=row['customer_id'],
                    pono=row['pono'],
                    po_sl_no=row['po_sl_no']
                )
                record.qty_balance = float(record.qty_balance) - float(row['qty_tobe_del'])
                record.qty_sent = float(record.qty_sent) + float(row["qty_tobe_del"])
                record.save()
            except ObjectDoesNotExist:
                return JsonResponse({"error": f"Record with cust_id={row['customer_id']}, po_sl_no={row['po_sl_no']} does not exist."}, status=404)

    GstRates.objects.filter(id=1).update(last_gcn_no=new_gcn_no)

    return JsonResponse({"success": True, "gcn_no": new_gcn_no})


@csrf_exempt
def invoice_generation(request):
    if request.method == "GET":
        gcn_no = request.GET.get("gcn_no")
        if not gcn_no:
            return JsonResponse({"error": "GCN number is required"}, status=400)
        
        # Derive the complete gcn_no for this invoice
        gst_rate = get_object_or_404(GstRates, id=1)
        fin_year = int(gst_rate.fin_year)
        f_year = fin_year + 1
        fyear = str(f_year)[2:]
        # gcn_no = gst_rate.last_gcn_no
        print("gcn_no: ", gcn_no)
        gcn_num = f"{str(gcn_no).zfill(3)}/{fin_year}-{fyear}"

        print("gcn_num: ", gcn_num)
        # Get data from otw_dc table
        otwdc_values = OtwDc.objects.filter(gcn_no=gcn_num)
        # print("otwdc_values: ", otwdc_values.values())
        if not otwdc_values.exists():
            return JsonResponse({"error": "No records found for the provided GCN number"}, status=404)

        def model_to_dic(instance):
            print(instance.__dict__['batch_quantity'], "\n")
            return {
                'sl_no': instance.sl_no,
                'gcn_no': instance.gcn_no,
                'gcn_date': str(instance.gcn_date),  # Convert date to string
                'po_no': instance.po_no,
                'po_date': str(instance.po_date),  # Convert date to string
                'cust_id': instance.cust_id,
                'consignee_id': instance.consignee_id,
                'prod_id': instance.prod_id,
                'po_sl_no': instance.po_sl_no,
                'prod_desc': instance.prod_desc,
                'additional_desc': instance.additional_desc,
                # 'omat': instance.omat,
                'hsn': instance.hsn_sac,
                'batch': instance.batch,
                'coc': instance.coc,
                'qty_delivered': instance.qty_delivered,
                'pack_size': instance.pack_size,
                'unit_price': instance.unit_price,
                'taxable_amt': instance.taxable_amt,
                'cgst_price': instance.cgst_price,
                'sgst_price': instance.sgst_price,
                'igst_price': instance.igst_price,
                "contact_name": instance.contact_name,
                "batch_quantity": instance.batch_quantity,
                "coc": instance.coc
            }
        
        otwdc_result = [model_to_dic(otwdc_value) for otwdc_value in otwdc_values]

        # print("otwdc_result", otwdc_result)
        
        unique_po_sl_no = {}
        for item in otwdc_result:
            if item['po_sl_no'] not in unique_po_sl_no:
                unique_po_sl_no[item['po_sl_no']]= item

        # print("entered")

        inv_result = list(unique_po_sl_no.values())
        odc1 = otwdc_values.first()
        # return JsonResponse({"inv_result": inv_result})

        print("odc1: ", odc1.__dict__)

        unwanted_po_sl_no = ("fr", "ins", "oc")
        final_otwdc = [otwdc for otwdc in otwdc_result if otwdc['po_sl_no'] not in unwanted_po_sl_no]
        r = get_object_or_404(CustomerMaster, cust_id=odc1.cust_id)
        print("entered")
        c = get_object_or_404(CustomerMaster, cust_id=odc1.consignee_id)

        print('entered')
        print("otwdc_values: ", otwdc_values)
        
        total_qty = otwdc_values.aggregate(total_qty=Sum('qty_delivered'))['total_qty'] or 0
        # total_taxable_value = inv_result.aggregate(total_taxable_value=Sum('taxable_amt'))['total_taxable_value'] or 0
        total_taxable_value = sum(item['taxable_amt'] for item in inv_result)
        total_cgst = sum(item['cgst_price'] for item in inv_result)
        total_sgst = sum(item['sgst_price'] for item in inv_result)
        total_igst = sum(item['igst_price'] for item in inv_result)
        # total_cgst = otwdc_values.aggregate(total_cgst=Sum('cgst_price'))['total_cgst'] or 0
        # total_sgst = otwdc_values.aggregate(total_sgst=Sum('sgst_price'))['total_sgst'] or 0
        # total_igst = otwdc_values.aggregate(total_igst=Sum('igst_price'))['total_igst'] or 0

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
            'total_qty': total_qty
        }
        return JsonResponse({"message": "success","inv_result": inv_result, "context": context}, safe=False)
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
                
                cust_id = result_first.customer_id
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
                        'hsnSac': item['hsn_sac']
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
            result = OtwDc.objects.filter(gcn_date__range=(start_date, end_date))\
                                  .exclude(taxable_amt=0)\
                                  .exclude(po_sl_no__in=['oc','ins','fr'])\
                                  .exclude(po_sl_no__regex=r'\.')\
                                  .select_related('cust_id')\
                                  .values('gcn_no', 'gcn_date', 'batch_quantity',
                                          'taxable_amt', 'cgst_price', 'sgst_price', 'igst_price',
                                          'cust_id__cust_name', 'cust_id__cust_gst_id', 'hsn_sac')\
                                  .order_by('gcn_date')

            # Create DataFrame
            df = pd.DataFrame(result)

            # Reformat DataFrame
            df = df[['cust_id__cust_name', 'cust_id__cust_gst_id', 'gcn_no', 'gcn_date', 'hsn_sac',
                     'batch_quantity', 'taxable_amt', 'cgst_price', 'sgst_price', 'igst_price']]
            df.insert(0, 'Sl No', range(1, len(df) + 1))
            # Reformat the 'gcn_date' into a readable string format
            df['gcn_date'] = pd.to_datetime(df['gcn_date']).dt.strftime('%d-%m-%Y')
            df = df.rename(columns={
                'gcn_no': 'Invoice Number',
                'gcn_date': 'Invoice Date',
                'hsn_sac': 'HSN/SAC',
                'batch_quantity': 'Quantity',
                'taxable_amt': 'Ass.Value',
                'cgst_price': 'CGST Price (9%)',
                'sgst_price': 'SGST Price (9%)',
                'igst_price': 'IGST Price (18%)',
                'cust_id__cust_name': 'Customer Name',
                'cust_id__cust_gst_id': 'Customer GST IN',
            })

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

            df1 = df[['Invoice Number', 'Customer Name', 'Customer GST IN', 'HSN/SAC']].drop_duplicates()
            df2 = df[['Invoice Number', 'Customer Name', 'Customer GST IN']].drop_duplicates()

            df1['Customer GST IN'].fillna('', inplace=True)
            df2['Customer GST IN'].fillna('', inplace=True)

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
                'Customer Name': '',
                'Customer GST IN': '',
                'Invoice Date': '',
                'Invoice Number': '',
                'HSN/SAC': '',
                'Quantity': '',
                'Ass.Value': total_taxable_amt,
                'CGST Price (9%)': total_cgst_price,
                'SGST Price (9%)': total_sgst_price,
                'IGST Price (18%)': total_igst_price,
                'Round Off': '',
            }, index=[0])

            total_row2 = pd.DataFrame({
                'Sl No': 'Total',
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

            combined_df[['Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']] = combined_df[['Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']].apply(lambda x: x.map('{:.2f}'.format))
            combined_df2[['Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']] = combined_df2[['Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']].apply(lambda x: x.map('{:.2f}'.format))

            combined_df.loc[combined_df['Sl No'] == 'Total', ['Round Off', 'HSN/SAC']] = ''
            combined_df2.loc[combined_df2['Sl No'] == 'Total', ['Round Off', 'HSN/SAC']] = ''

            column_order = ['Sl No', 'Customer Name', 'Customer GST IN', 'Invoice Number', 'Invoice Date', 'HSN/SAC', 'Quantity', 'Ass.Value', 'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 'Invoice Value', 'Round Off']
            combined_df = combined_df[column_order]
            combined_df2 = combined_df2[column_order]

            combined_df2['HSN/SAC'].fillna('', inplace=True)

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