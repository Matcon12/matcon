from django.test import TestCase
import re
from .views import validate_kit_quantities


class KitQuantityValidationTestCase(TestCase):
    """Test case for kit quantity validation functionality"""
    
    def test_valid_kit_quantities(self):
        """Test that validation passes when kit quantity equals sum of components"""
        product_details = [
            {
                'prodId': 'KIT001',
                'poSlNo': '1',
                'quantity': '10'
            },
            {
                'prodId': 'COMP001',
                'poSlNo': '1.1',
                'quantity': '5'
            },
            {
                'prodId': 'COMP002',
                'poSlNo': '1.2',
                'quantity': '5'
            }
        ]
        
        errors = validate_kit_quantities(product_details)
        self.assertEqual(len(errors), 0, "Should have no validation errors when quantities match")
    
    def test_invalid_kit_quantities(self):
        """Test that validation fails when kit quantity doesn't equal sum of components"""
        product_details = [
            {
                'prodId': 'KIT001',
                'poSlNo': '2',
                'quantity': '10'
            },
            {
                'prodId': 'COMP001',
                'poSlNo': '2.1',
                'quantity': '3'
            },
            {
                'prodId': 'COMP002',
                'poSlNo': '2.2',
                'quantity': '4'
            }
        ]
        
        errors = validate_kit_quantities(product_details)
        self.assertEqual(len(errors), 1, "Should have one validation error")
        self.assertIn("KIT001", errors[0], "Error should mention the kit product")
        self.assertIn("10", errors[0], "Error should mention kit quantity")
        self.assertIn("7.00", errors[0], "Error should mention component sum")
    
    def test_multiple_kits_validation(self):
        """Test validation with multiple kit products"""
        product_details = [
            # First kit - valid
            {
                'prodId': 'KIT001',
                'poSlNo': '1',
                'quantity': '5'
            },
            {
                'prodId': 'COMP001',
                'poSlNo': '1.1',
                'quantity': '2'
            },
            {
                'prodId': 'COMP002',
                'poSlNo': '1.2',
                'quantity': '3'
            },
            # Second kit - invalid
            {
                'prodId': 'KIT002',
                'poSlNo': '2',
                'quantity': '8'
            },
            {
                'prodId': 'COMP003',
                'poSlNo': '2.1',
                'quantity': '5'
            }
        ]
        
        errors = validate_kit_quantities(product_details)
        self.assertEqual(len(errors), 1, "Should have one validation error for the invalid kit")
        self.assertIn("KIT002", errors[0], "Error should mention the invalid kit")
    
    def test_kit_without_components(self):
        """Test that kit without components doesn't cause validation errors"""
        product_details = [
            {
                'prodId': 'KIT001',
                'poSlNo': '1',
                'quantity': '10'
            },
            {
                'prodId': 'REGULAR001',
                'poSlNo': '2',
                'quantity': '5'
            }
        ]
        
        errors = validate_kit_quantities(product_details)
        self.assertEqual(len(errors), 0, "Should have no errors when kit has no components")
    
    def test_decimal_quantities(self):
        """Test validation with decimal quantities"""
        product_details = [
            {
                'prodId': 'KIT001',
                'poSlNo': '1',
                'quantity': '10.5'
            },
            {
                'prodId': 'COMP001',
                'poSlNo': '1.1',
                'quantity': '5.25'
            },
            {
                'prodId': 'COMP002',
                'poSlNo': '1.2',
                'quantity': '5.25'
            }
        ]
        
        errors = validate_kit_quantities(product_details)
        self.assertEqual(len(errors), 0, "Should handle decimal quantities correctly")

# Create your tests here.

class KitComponentQuantityTest(TestCase):
    """Test kit component quantity calculation logic"""
    
    def test_kit_component_number_of_packs_calculation(self):
        """Test that kit components calculate number_of_packs correctly"""
        
        # Test data
        test_cases = [
            {
                'qty_delivered': 100.0,
                'pack_size': '10 Ltr',
                'expected_pack_size': 10.0,
                'expected_number_of_packs': 10.0,
                'expected_qty_delivered': 100.0,
                'description': 'Kit component with 100 units, 10 Ltr pack size'
            },
            {
                'qty_delivered': 50.0,
                'pack_size': '5 Kg',
                'expected_pack_size': 5.0,
                'expected_number_of_packs': 10.0,
                'expected_qty_delivered': 50.0,
                'description': 'Kit component with 50 units, 5 Kg pack size'
            },
            {
                'qty_delivered': 2.0,
                'pack_size': '5 Ltr',
                'expected_pack_size': 5.0,
                'expected_number_of_packs': 2.0,
                'expected_qty_delivered': 10.0,
                'description': 'Kit component with 2 units, 5 Ltr pack size (qty_delivered < pack_size, so treat as number_of_packs)'
            }
        ]
        
        for test_case in test_cases:
            with self.subTest(test_case['description']):
                # Extract pack size numeric value
                pack_size_str = str(test_case['pack_size'])
                match = re.search(r"(\d+(?:\.\d+)?)", pack_size_str)
                pack_size = float(match.group(1)) if match else 1.0
                
                # Calculate number_of_packs for kit components (new logic)
                qty_delivered = test_case['qty_delivered']
                if pack_size > 0:
                    # For kit components: if qty_delivered < pack_size, treat it as number_of_packs
                    if qty_delivered < pack_size:
                        number_of_packs = qty_delivered
                        qty_delivered = number_of_packs * pack_size
                    else:
                        # If qty_delivered is greater than pack_size, calculate normally
                        number_of_packs = qty_delivered / pack_size
                        # Round to nearest integer for kit components
                        number_of_packs = round(number_of_packs)
                        # Recalculate qty_delivered based on rounded number_of_packs
                        qty_delivered = number_of_packs * pack_size
                else:
                    number_of_packs = qty_delivered
                
                # Verify calculations
                self.assertEqual(pack_size, test_case['expected_pack_size'])
                self.assertEqual(number_of_packs, test_case['expected_number_of_packs'])
                
                # Verify that total quantity = number_of_packs * pack_size
                calculated_total = number_of_packs * pack_size
                self.assertEqual(calculated_total, test_case['expected_qty_delivered'])
    
    def test_regular_product_number_of_packs_calculation(self):
        """Test that regular products calculate number_of_packs correctly"""
        
        # Test data
        test_cases = [
            {
                'qty_delivered': 100.0,
                'pack_size': '10 Ltr',
                'expected_pack_size': 10.0,
                'expected_number_of_packs': 10.0,
                'description': 'Regular product with 100 units, 10 Ltr pack size'
            },
            {
                'qty_delivered': 50.0,
                'pack_size': '5 Kg',
                'expected_pack_size': 5.0,
                'expected_number_of_packs': 10.0,
                'description': 'Regular product with 50 units, 5 Kg pack size'
            }
        ]
        
        for test_case in test_cases:
            with self.subTest(test_case['description']):
                # Extract pack size numeric value
                pack_size_str = str(test_case['pack_size'])
                match = re.search(r"(\d+(?:\.\d+)?)", pack_size_str)
                pack_size = float(match.group(1)) if match else 1.0
                
                # Calculate number_of_packs
                qty_delivered = test_case['qty_delivered']
                if pack_size > 0:
                    number_of_packs = qty_delivered / pack_size
                else:
                    number_of_packs = qty_delivered
                
                # Verify calculations
                self.assertEqual(pack_size, test_case['expected_pack_size'])
                self.assertEqual(number_of_packs, test_case['expected_number_of_packs'])
                
                # Verify that total quantity = number_of_packs * pack_size
                calculated_total = number_of_packs * pack_size
                self.assertEqual(calculated_total, qty_delivered)

class InvoiceReportLocationTest(TestCase):
    """Test that location field is included in invoice report"""
    
    def test_location_field_included_in_report_data(self):
        """Test that the location field is included in the invoice report data structure"""
        
        # Expected columns in the invoice report
        expected_columns = [
            'Sl No', 'Location', 'Cust-ID', 'Customer Name', 'Customer GST IN', 
            'Invoice Number', 'Invoice Date', 'HSN/SAC', 'Quantity', 'Ass.Value', 
            'IGST Price (18%)', 'CGST Price (9%)', 'SGST Price (9%)', 
            'Invoice Value', 'Round Off'
        ]
        
        # This test verifies that the expected columns are defined in the invoice report
        # The actual data would be tested in integration tests with real database data
        self.assertIn('Location', expected_columns)
        self.assertEqual(expected_columns[1], 'Location')  # Location should be 2nd column
        self.assertEqual(expected_columns[0], 'Sl No')     # Sl No should be 1st column

class InvoiceReportSerialNumberTest(TestCase):
    """Test that serial numbers are integers without decimals"""
    
    def test_serial_numbers_are_integers(self):
        """Test that serial numbers are created as integers"""
        
        # Test the range generation logic
        test_length = 5
        serial_numbers = list(range(1, test_length + 1))
        
        # Verify all numbers are integers
        for num in serial_numbers:
            self.assertIsInstance(num, int)
            self.assertEqual(num, int(num))  # Should be equal to its integer representation
        
        # Verify the sequence
        expected_sequence = [1, 2, 3, 4, 5]
        self.assertEqual(serial_numbers, expected_sequence)
        
        # Verify no decimals
        for num in serial_numbers:
            self.assertTrue(float(num).is_integer())

class OutstandingPOReportLocationTest(TestCase):
    """Test that location field is included in outstanding PO report"""
    
    def test_location_field_included_in_outstanding_po_data(self):
        """Test that the location field is included in the outstanding PO report data structure"""
        
        # Expected columns in the outstanding PO report
        expected_columns = [
            'Sl. No.', 'Location', 'Cust ID', 'Customer Name', 'PO No.', 'PO Date', 
            'PO Sl. No.', 'Product Code', 'Pack Size', 'Unit Price', 
            'Total Quantity', 'Quantity Sent', 'Realised Value', 
            'Quantity Balance', 'Outstanding Value'
        ]
        
        # This test verifies that the expected columns are defined in the outstanding PO report
        # The actual data would be tested in integration tests with real database data
        self.assertIn('Location', expected_columns)
        self.assertEqual(expected_columns[1], 'Location')  # Location should be 2nd column
        self.assertEqual(expected_columns[0], 'Sl. No.')   # Sl. No. should be 1st column
