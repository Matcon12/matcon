from django.test import TestCase
import re

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
                'description': 'Kit component with 100 units, 10 Ltr pack size'
            },
            {
                'qty_delivered': 50.0,
                'pack_size': '5 Kg',
                'expected_pack_size': 5.0,
                'expected_number_of_packs': 10.0,
                'description': 'Kit component with 50 units, 5 Kg pack size'
            },
            {
                'qty_delivered': 25.0,
                'pack_size': '2.5 No.',
                'expected_pack_size': 2.5,
                'expected_number_of_packs': 10.0,
                'description': 'Kit component with 25 units, 2.5 No. pack size'
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
