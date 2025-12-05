from django.contrib import admin
from django.urls import path, include
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.homepage),
    path('search/', include('invoice.urls')),
    path('purchase_order/', include('purchase_order.urls')),
]

urlpatterns += staticfiles_urlpatterns()    