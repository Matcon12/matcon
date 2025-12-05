from django import forms
from .models import Invoice

class MyModelForm(forms.ModelForm):
  class Meta:
    model = Invoice
    fields = ['invoice_no']


class ExcelUploadForm(forms.Form):
    excel_file = forms.FileField(label='Select an Excel file')
