from django.urls import path
from . import views

app_name = 'purchase_order'

urlpatterns = [
  path('', views.index, name='index'),
  path('packSize', views.get_pack_size, name='purchase'),
  path('customerName', views.get_customer_detail, name='customer'),
  path('submitForm', views.submit_form, name='submitForm'),
  path('getData', views.get_data_purchase_order, name='updateForm'),
  path('getDataPoCust', views.get_data_po_cust, name='updateForm'),
  path('updateForm', views.update_purchase_order, name='updateForm'),
  path('addCustomerDetails', views.add_customer_details, name='addCustomerDetails'),
  path('getCustomerData', views.get_customer_data, name="getCustomerData"),
  path("getCustomerDetails", views.get_customer_details, name="getCustomerDetails"),
  path("getPurchaseOrder", views.get_purchase_order, name="getPurchaseOrder"),
  path("updateCustomerDetails", views.update_customer_details, name="updateCustomerDetails"),
  path("addProductDetails", views.add_product_details, name="addProductDetails"),
  path("getProductDetails", views.get_product_details, name="getProductDetails"),
  path("getProductData", views.get_product_data, name="getProductData"),
  path("getProductCodes", views.get_product_codes, name="getProductCodes"),
  path("updateProductDetails", views.update_product_details, name="updateProductDetails"),
  path("invoiceProcessing", views.invoice_processing, name="invoiceProcessing"),
  path("invoiceGeneration", views.invoice_generation, name="invoiceGeneration"),
  path("getInvoiceData", views.get_invoice_data, name="getInvoiceData"),
  path("getStateData", views.get_state_data, name="getStateData"),
  path("invoiceReport", views.invoice_report, name="invoiceReport"),
  path("signup", views.signup, name="signup"),
  path("login", views.login, name="login"),
  path("test_token", views.test_token, name="test_token"),
  path("logout", views.logout, name="logout"),
  path("getAllFinalPo", views.getAllFinalPo, name="getallfinalpo"),
  path("postFinalPo", views.postFinalPo, name="postfinalpo"),
  path("updateFinalPo", views.updateFinalPo, name="updatefinalpo"),
  path("getContactNames", views.get_contact_names, name="contactNames"),
  path("updateUserStatus", views.update_user_status, name="update_user_status")
]