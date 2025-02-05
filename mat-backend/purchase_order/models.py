# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class CustomerMaster(models.Model):
    cust_id = models.CharField(primary_key=True, max_length=10)
    cust_name = models.CharField(max_length=50, blank=True, null=True)
    cust_addr1 = models.CharField(max_length=50, blank=True, null=True)
    cust_addr2 = models.CharField(max_length=50, blank=True, null=True)
    cust_city = models.CharField(max_length=15, blank=True, null=True)
    cust_st_code = models.IntegerField(blank=True, null=True)
    cust_st_name = models.CharField(max_length=20, blank=True, null=True)
    cust_pin = models.CharField(max_length=6, blank=True, null=True)
    cust_gst_id = models.CharField(max_length=20, blank=True, null=True)
    contact_name_1 = models.CharField(max_length=20, blank=True, null=True)
    contact_phone_1 = models.CharField(max_length=15, blank=True, null=True)
    contact_email_1 = models.CharField(max_length=20, blank=True, null=True)
    contact_name_2 = models.CharField(max_length=20, blank=True, null=True)
    contact_phone_2 = models.CharField(max_length=15, blank=True, null=True)
    contact_email_2 = models.CharField(max_length=20, blank=True, null=True)
    gst_exemption = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Customer_Master'


class CustomerPurchaseOrder(models.Model):
    slno = models.AutoField(primary_key=True)
    pono = models.TextField(blank=True, null=True)
    podate = models.DateField(blank=True, null=True)
    quote_id = models.TextField(blank=True, null=True)
    quote_date = models.DateField(blank=True, null=True)
    cust = models.ForeignKey(CustomerMaster, models.DO_NOTHING, blank=True, null=True)
    consignee_id = models.TextField(blank=True, null=True)
    po_sl_no = models.TextField(blank=True, null=True)
    prod_code = models.TextField(blank=True, null=True)
    prod_desc = models.TextField(blank=True, null=True)
    additional_desc = models.TextField(blank=True, null=True)
    pack_size = models.TextField(blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    uom = models.TextField(blank=True, null=True)
    hsn_sac = models.TextField(blank=True, null=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    qty_balance = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    qty_sent = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    delivery_date = models.DateField(blank=True, null=True)
    po_validity = models.DateField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Customer_Purchase_Order'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)
    name = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()
    first_name = models.CharField(max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class AuthtokenToken(models.Model):
    key = models.CharField(primary_key=True, max_length=40)
    created = models.DateTimeField()
    user = models.OneToOneField(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'authtoken_token'


class DjangoAdminLog(models.Model):
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    action_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class GstRates(models.Model):
    cgst_rate = models.IntegerField(blank=True, null=True)
    sgst_rate = models.IntegerField(blank=True, null=True)
    igst_rate = models.IntegerField(blank=True, null=True)
    fin_year = models.IntegerField(blank=True, null=True)
    last_gcn_no = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'gst_rates'


class GstStateCode(models.Model):
    state_code = models.AutoField(primary_key=True)
    state_name = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'gst_state_code'


class OtwDc(models.Model):
    sl_no = models.AutoField(primary_key=True)  # The composite primary key (sl_no, cust_id) found, that is not supported. The first column is selected.
    gcn_no = models.CharField(max_length=20, blank=True, null=True)
    gcn_date = models.DateField(blank=True, null=True)
    po_no = models.CharField(max_length=15, blank=True, null=True)
    po_date = models.DateField(blank=True, null=True)
    cust = models.ForeignKey(CustomerMaster, models.DO_NOTHING)
    consignee_id = models.CharField(max_length=10, blank=True, null=True)
    prod_id = models.CharField(max_length=15, blank=True, null=True)
    po_sl_no = models.CharField(max_length=10, blank=True, null=True)
    prod_desc = models.CharField(max_length=50, blank=True, null=True)
    additional_desc = models.CharField(max_length=50, blank=True, null=True)
    omat = models.CharField(max_length=50, blank=True, null=True)
    qty_delivered = models.TextField(blank=True, null=True)
    pack_size = models.TextField(blank=True, null=True)
    unit_price = models.TextField(blank=True, null=True)  
    taxable_amt = models.TextField(blank=True, null=True)  
    cgst_price = models.TextField(blank=True, null=True)  
    sgst_price = models.TextField(blank=True, null=True)  
    igst_price = models.TextField(blank=True, null=True)  
    # unit_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # taxable_amt = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # cgst_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # sgst_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # igst_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    hsn_sac = models.CharField(max_length=10, blank=True, null=True)
    batch = models.CharField(max_length=10, blank=True, null=True)
    coc = models.CharField(max_length=10, blank=True, null=True)
    batch_quantity = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    contact_name = models.CharField(max_length=20, blank=True, null=True)
    contact_number = models.CharField(max_length=15, blank=True, null=True)
    gst_exemption = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'otw_dc'


class SupplierProductMaster(models.Model):
    prod_id = models.CharField(primary_key=True, max_length=30)  # The composite primary key (prod_id, pack_size) found, that is not supported. The first column is selected.
    supp_id = models.CharField(max_length=30, blank=True, null=True)
    prod_desc = models.CharField(max_length=50, blank=True, null=True)
    spec_id = models.CharField(max_length=50, blank=True, null=True)
    pack_size = models.CharField(max_length=10, blank=True, null=True)
    currency = models.CharField(max_length=5, blank=True, null=True)
    price = models.TextField(blank=True, null=True)  # This field type is a guess.
    hsn_code = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'supplier_product_master'


class FinalPo(models.Model):
    slno = models.AutoField(primary_key=True)  # The composite primary key (slno, pono, customer_id, po_sl_no) found, that is not supported. The first column is selected.
    pono = models.CharField(max_length=100)
    podate = models.DateField(blank=True, null=True)
    quote_id = models.CharField(max_length=15, blank=True, null=True)
    quote_date = models.DateField(blank=True, null=True)
    customer_id = models.CharField(max_length=15)
    consignee_id = models.CharField(max_length=15, blank=True, null=True)
    po_sl_no = models.CharField(max_length=5)
    prod_code = models.CharField(max_length=30, blank=True, null=True)
    prod_desc = models.CharField(max_length=50, blank=True, null=True)
    additional_desc = models.CharField(max_length=50, blank=True, null=True)
    omat = models.CharField(max_length=50, blank=True, null=True)
    pack_size = models.CharField(max_length=10, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    uom = models.CharField(max_length=5, blank=True, null=True)
    hsn_sac = models.CharField(max_length=10, blank=True, null=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    qty_balance = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    qty_sent = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # max_digits and decimal_places have been guessed, as this database handles decimal fields as float
    delivery_date = models.DateField(blank=True, null=True)
    po_validity = models.DateField(blank=True, null=True)
    gst_applicable = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'final_po'