from django.http import HttpResponse
from .models import Invoice, PriceList, SupplierInvoice
from django.shortcuts import render, redirect
from .forms import ExcelUploadForm
from .utils import process_excel_file
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt

def invoice_list(request):
  return render(request, 'invoice/invoice.html', {"title": "Invoice"})

@csrf_exempt
def search_data(request):
  if request.method == 'POST':
      product_code = request.POST.get('product_code')
      results = Invoice.objects.filter(product_code=product_code)
      
      results = sorted(results, key=lambda x: datetime.strptime(x.invoice_date, '%d-%m-%Y'))
      context = {
          'invoices': results
      }
      return render(request, 'invoice/invoice.html', context)
  return render(request, 'invoice/invoice.html')


#Get all the data from the invoice table
def get_all_data(request):
  invoices = sorted(Invoice.objects.all(), key=lambda x: datetime.strptime(x.invoice_date, '%d-%m-%Y'))
  context = {
    'invoices': invoices
  }
  return render(request, 'invoice/all_data.html', context)

#Upload the xlsx file to the SupplierInvoice table
def upload_form(request):
  if request.method == 'POST':
    form = ExcelUploadForm(request.POST, request.FILES)
    if form.is_valid():
        excel_file = request.FILES['excel_file']
        process_excel_file(excel_file)
        return redirect('invoice:upload_success')
  else:
    form = ExcelUploadForm()  
  return render(request, 'invoice/upload_form.html', {'form': form})  

#Success message on uploading the form
def upload_success(request):
  return render(request, 'invoice/upload_success.html')

#Get the data from the price_list table
def price_list(request):
  product_code = request.POST.get('product_code')
  results = PriceList.objects.filter(product_code=product_code)
  context = {
    'price_lists': results
  }
  return render(request, 'invoice/price_list.html', context)