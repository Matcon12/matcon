import pandas as pd
from .models import SupplierInvoice

def process_excel_file(excel_file):
    try:
        # Read the specified sheet from the Excel file
        sheets = pd.read_excel(excel_file, sheet_name=None, engine='openpyxl')
        
        df = pd.concat(sheets.values(), ignore_index=True)

        # Add a unique identifier column based on row index
        df['unique_identifier'] = df.index

        # Delete existing records from the Invoice table
        SupplierInvoice.objects.all().delete()

        # Prepare data for bulk creation
        invoice_objects = []
        for index, row in df.iterrows():
            row = row.fillna('')
            invoice_objects.append(SupplierInvoice(
                party_name=row['Party Name'],
                po_date=str(row['PO Date']),
                invoice_no=row['Invoice No'],
                invoice_date=str(row['Invoice Date']),
                product_code=row['Product Code'],
                product_description=row['Product Description'],
                specification=row['Specification'],
                tariff_code=row['Tariff Code'],
                pack_size=row['Pack Size'],
                quantity=str(row['Quantity']),
                uom=row['UOM'],
                total_quantity=row['Total Quantity'],
                currency=row['Currency'],
                unit_price=row['Unit Price'],
                total_amount=row['Total Amount'],
                rate=row['Rate'],
                unit_price_in_rs=row['Unit Price In Rs'],
                tot_amt_rs_field=row['Tot Amt Rs.'],
                cd=row['CD'],
                igst=row['IGST'],
                foreign_freight_excl_gst_field=row['Foreign Freight\n ( Excl GST )'],
                ex_works_freight_uk_excl_gst_field=row['Ex works Freight UK\n ( Excl GST)'],
                cha_charges_excl_gst_field=row['CHA Charges\n(Excl GST)'],
                total_incl_b_e_igst_excl_cha_igst=row['Total incl\nB/E IGST  Excl CHA IGST'],
                unit_landed_cost_rs_col_24_col_12=row['Unit Landed Cost (Rs.)\nCol 24/col 12'],
                b_e_gross_weight_kgs=row['B/E Gross weight Kgs'],
                field_f_freight_ex_works_freight_cha_charges_gw=row['(F  Freight+ Ex Works Freight+CHA charges)/\nGW']
            ))
        # Bulk create Invoice objects
        SupplierInvoice.objects.bulk_create(invoice_objects)

    except Exception as e:
        print("An error occurred:", e)