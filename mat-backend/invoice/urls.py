from django.urls import path
from . import views

app_name = 'invoice'

urlpatterns = [
  path('invoice', views.search_data, name='invoice'),
  path('all_data', views.get_all_data, name='all_data'),
  path('upload_form', views.upload_form, name='upload_form'),
  path('upload_success', views.upload_success, name='upload_success'),
  path('price_list', views.price_list, name ='price_list'),
]