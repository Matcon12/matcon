from django.db import models

class Invoice(models.Model):
    party_name = models.TextField(db_column='Party Name', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    po_date = models.TextField(db_column='PO Date', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    invoice_no = models.TextField(db_column='Invoice No', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    invoice_date = models.TextField(db_column='Invoice Date', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    product_code = models.TextField(db_column='Product Code', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    product_description = models.TextField(db_column='Product Description', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    specification = models.TextField(db_column='Specification', blank=True, null=True)  # Field name made lowercase.
    tariff_code = models.TextField(db_column='Tariff Code', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    pack_size = models.TextField(db_column='Pack Size', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    quantity = models.TextField(db_column='Quantity', blank=True, null=True)  # Field name made lowercase.
    uom = models.TextField(db_column='UOM', blank=True, null=True)  # Field name made lowercase.
    total_quantity = models.TextField(db_column='Total Quantity', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    currency = models.TextField(db_column='Currency', blank=True, null=True)  # Field name made lowercase.
    unit_price = models.TextField(db_column='Unit Price', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    total_amount = models.TextField(db_column='Total Amount', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    rate = models.TextField(db_column='Rate', blank=True, null=True)  # Field name made lowercase.
    unit_price_in_rs = models.TextField(db_column='Unit Price In Rs', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    tot_amt_rs_field = models.TextField(db_column='Tot Amt Rs.', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    cd = models.TextField(db_column='CD', blank=True, null=True)  # Field name made lowercase.
    igst = models.TextField(db_column='IGST', blank=True, null=True)  # Field name made lowercase.
    foreign_freight_excl_gst_field = models.TextField(db_column='Foreign Freight\n ( Excl GST )', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    ex_works_freight_uk_excl_gst_field = models.TextField(db_column='Ex works Freight UK\n ( Excl GST)', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    cha_charges_excl_gst_field = models.TextField(db_column='CHA Charges\n(Excl GST)', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    total_incl_b_e_igst_excl_cha_igst = models.TextField(db_column='Total incl\nB/E IGST  Excl CHA IGST', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    unit_landed_cost_rs_col_24_col_12 = models.TextField(db_column='Unit Landed Cost (Rs.)\nCol 24/col 12', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    b_e_gross_weight_kgs = models.TextField(db_column='B/E Gross weight Kgs', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    field_f_freight_ex_works_freight_cha_charges_gw = models.TextField(db_column='(F  Freight+ Ex Works Freight+CHA charges)/\nGW', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it started with '_'.

    class Meta:
        managed = False
        db_table = 'invoice'
        
class PriceList(models.Model):
    product_code = models.TextField(db_column='Product Code', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    product_description = models.TextField(db_column='Product Description', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    number_2022_rates = models.TextField(db_column='2022 Rates', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it wasn't a valid Python identifier.
    percentage_change_22_23_field = models.TextField(db_column='Percentage change(22-23)', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    number_2023_rates = models.TextField(db_column='2023 Rates', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it wasn't a valid Python identifier.
    percentage_change_23_24_field = models.TextField(db_column='Percentage change(23-24)', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    number_2024_rates = models.TextField(db_column='2024 Rates', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it wasn't a valid Python identifier.

    class Meta:
        managed = False
        db_table = 'price_list'
        
class SupplierInvoice(models.Model):
    party_name = models.TextField(db_column='Party Name', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    po_date = models.TextField(db_column='PO Date', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    invoice_no = models.TextField(db_column='Invoice No', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    invoice_date = models.TextField(db_column='Invoice Date', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    product_code = models.TextField(db_column='Product Code', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    product_description = models.TextField(db_column='Product Description', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    specification = models.TextField(db_column='Specification', blank=True, null=True)  # Field name made lowercase.
    tariff_code = models.TextField(db_column='Tariff Code', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    pack_size = models.TextField(db_column='Pack Size', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    quantity = models.CharField(db_column='Quantity', max_length=10, blank=True, null=True)  # Field name made lowercase.
    uom = models.TextField(db_column='UOM', blank=True, null=True)  # Field name made lowercase.
    total_quantity = models.TextField(db_column='Total Quantity', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    currency = models.TextField(db_column='Currency', blank=True, null=True)  # Field name made lowercase.
    unit_price = models.TextField(db_column='Unit Price', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    total_amount = models.TextField(db_column='Total Amount', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    rate = models.TextField(db_column='Rate', blank=True, null=True)  # Field name made lowercase.
    unit_price_in_rs = models.TextField(db_column='Unit Price In Rs', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    tot_amt_rs_field = models.TextField(db_column='Tot Amt Rs.', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    cd = models.TextField(db_column='CD', blank=True, null=True)  # Field name made lowercase.
    igst = models.TextField(db_column='IGST', blank=True, null=True)  # Field name made lowercase.
    foreign_freight_excl_gst_field = models.TextField(db_column='Foreign Freight\n ( Excl GST )', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    ex_works_freight_uk_excl_gst_field = models.TextField(db_column='Ex works Freight UK\n ( Excl GST)', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    cha_charges_excl_gst_field = models.TextField(db_column='CHA Charges\n(Excl GST)', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    total_incl_b_e_igst_excl_cha_igst = models.TextField(db_column='Total incl\nB/E IGST  Excl CHA IGST', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    unit_landed_cost_rs_col_24_col_12 = models.TextField(db_column='Unit Landed Cost (Rs.)\nCol 24/col 12', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    b_e_gross_weight_kgs = models.TextField(db_column='B/E Gross weight Kgs', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters.
    field_f_freight_ex_works_freight_cha_charges_gw = models.TextField(db_column='(F  Freight+ Ex Works Freight+CHA charges)/\nGW', blank=True, null=True)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it started with '_'.

    class Meta:
        managed = False
        db_table = 'supplier_invoice'