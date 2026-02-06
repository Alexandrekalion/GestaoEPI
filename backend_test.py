#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CipolattiAPITester:
    def __init__(self, base_url="https://epitrack-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return success, response_data, response.status_code

        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", 0

    def test_login(self):
        """Test login with initial credentials"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with current credentials (password may have been changed)
        success, response, status = self.make_request(
            'POST', 'auth/login', 
            {"username": "administrador", "password": "NovaSenha123@"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            must_change = response.get('must_change_password', False)
            role = response.get('role', '')
            
            self.log_result("Login with current credentials", True)
            self.log_result(f"Must change password: {must_change}", True)
            self.log_result(f"User role: {role}", role == 'super_admin')
            
            return must_change
        else:
            self.log_result("Login with current credentials", False, f"Status: {status}, Response: {response}")
            return False

    def test_change_password(self):
        """Test password change"""
        success, response, status = self.make_request(
            'POST', 'auth/change-password',
            {
                "old_password": "LR1a2b3c4567@",
                "new_password": "NovaSenha123@"
            }
        )
        
        self.log_result("Change password", success, f"Status: {status}" if not success else "")
        
        if success:
            # Test login with new password
            success, response, status = self.make_request(
                'POST', 'auth/login',
                {"username": "administrador", "password": "NovaSenha123@"}
            )
            
            if success and 'access_token' in response:
                self.token = response['access_token']
                self.log_result("Login with new password", True)
                return True
            else:
                self.log_result("Login with new password", False, f"Status: {status}")
                return False
        
        return False

    def test_user_info(self):
        """Test getting current user info"""
        success, response, status = self.make_request('GET', 'auth/me')
        self.log_result("Get current user info", success, f"Status: {status}" if not success else "")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard...")
        
        success, response, status = self.make_request('GET', 'dashboard/stats')
        
        if success:
            required_fields = ['active_employees', 'total_epis', 'low_stock_count', 'recent_deliveries']
            has_all_fields = all(field in response for field in required_fields)
            self.log_result("Dashboard stats", has_all_fields, "Missing required fields" if not has_all_fields else "")
        else:
            self.log_result("Dashboard stats", False, f"Status: {status}")

    def test_license_management(self):
        """Test license management (super-admin only)"""
        print("\n🔑 Testing License Management...")
        
        # Get license info
        success, response, status = self.make_request('GET', 'license')
        
        if success:
            required_fields = ['days_remaining', 'expires_at']
            has_all_fields = all(field in response for field in required_fields)
            self.log_result("Get license info", has_all_fields, "Missing required fields" if not has_all_fields else "")
            
            # Test adding days to license
            success, response, status = self.make_request(
                'POST', 'license/add-days',
                {"days": 1, "reason": "Test addition"}
            )
            self.log_result("Add license days", success, f"Status: {status}" if not success else "")
            
        else:
            self.log_result("Get license info", False, f"Status: {status}")

    def test_companies_crud(self):
        """Test companies CRUD operations"""
        print("\n🏢 Testing Companies...")
        
        # Get companies
        success, response, status = self.make_request('GET', 'companies')
        self.log_result("Get companies", success, f"Status: {status}" if not success else "")
        
        # Create company
        company_data = {
            "legal_name": "Empresa Teste LTDA",
            "trade_name": "Teste Corp",
            "cnpj": "12.345.678/0001-90",
            "address": "Rua Teste, 123",
            "contact_person": "João Teste",
            "contact_phone": "(11) 99999-9999",
            "contact_email": "teste@empresa.com"
        }
        
        success, response, status = self.make_request('POST', 'companies', company_data, 200)
        
        if success and 'id' in response:
            company_id = response['id']
            self.log_result("Create company", True)
            
            # Get specific company
            success, response, status = self.make_request('GET', f'companies/{company_id}')
            self.log_result("Get specific company", success, f"Status: {status}" if not success else "")
            
        else:
            self.log_result("Create company", False, f"Status: {status}, Response: {response}")

    def test_employees_crud(self):
        """Test employees CRUD operations"""
        print("\n👥 Testing Employees...")
        
        # Get employees
        success, response, status = self.make_request('GET', 'employees')
        self.log_result("Get employees", success, f"Status: {status}" if not success else "")
        
        # Create employee
        employee_data = {
            "full_name": "João da Silva Teste",
            "cpf": "123.456.789-00",
            "email": "joao.teste@empresa.com",
            "phone": "(11) 98888-8888",
            "department": "TI",
            "position": "Desenvolvedor",
            "status": "active"
        }
        
        success, response, status = self.make_request('POST', 'employees', employee_data, 200)
        
        if success and 'id' in response:
            employee_id = response['id']
            self.log_result("Create employee", True)
            
            # Get specific employee
            success, response, status = self.make_request('GET', f'employees/{employee_id}')
            self.log_result("Get specific employee", success, f"Status: {status}" if not success else "")
            
        else:
            self.log_result("Create employee", False, f"Status: {status}, Response: {response}")

    def test_epis_crud(self):
        """Test EPIs CRUD operations"""
        print("\n🦺 Testing EPIs...")
        
        # Get EPIs
        success, response, status = self.make_request('GET', 'epis')
        self.log_result("Get EPIs", success, f"Status: {status}" if not success else "")
        
        # Create EPI
        epi_data = {
            "name": "Capacete de Segurança Teste",
            "type_category": "Proteção da Cabeça",
            "ca_number": "12345",
            "brand": "Marca Teste",
            "size": "Único",
            "current_stock": 10,
            "min_stock": 2
        }
        
        success, response, status = self.make_request('POST', 'epis', epi_data, 200)
        
        if success and 'id' in response:
            epi_id = response['id']
            self.log_result("Create EPI", True)
            
            # Get specific EPI
            success, response, status = self.make_request('GET', f'epis/{epi_id}')
            self.log_result("Get specific EPI", success, f"Status: {status}" if not success else "")
            
        else:
            self.log_result("Create EPI", False, f"Status: {status}, Response: {response}")

    def test_stock_alerts(self):
        """Test stock alerts"""
        print("\n📦 Testing Stock Management...")
        
        success, response, status = self.make_request('GET', 'stock/alerts')
        
        if success:
            required_fields = ['low_stock', 'expiring_soon']
            has_all_fields = all(field in response for field in required_fields)
            self.log_result("Stock alerts", has_all_fields, "Missing required fields" if not has_all_fields else "")
        else:
            self.log_result("Stock alerts", False, f"Status: {status}")

    def test_users_management(self):
        """Test user management (admin/super-admin only)"""
        print("\n👤 Testing User Management...")
        
        # Get users
        success, response, status = self.make_request('GET', 'users')
        self.log_result("Get users", success, f"Status: {status}" if not success else "")
        
        # Create user
        user_data = {
            "username": "teste_user",
            "email": "teste@cipolatti.com",
            "password": "TesteSenha123@",
            "role": "gestor"
        }
        
        success, response, status = self.make_request('POST', 'users', user_data, 200)
        self.log_result("Create user", success, f"Status: {status}, Response: {response}" if not success else "")

    def test_suppliers(self):
        """Test suppliers"""
        print("\n🏭 Testing Suppliers...")
        
        success, response, status = self.make_request('GET', 'suppliers')
        self.log_result("Get suppliers", success, f"Status: {status}" if not success else "")

    def test_tools(self):
        """Test tools"""
        print("\n🔧 Testing Tools...")
        
        success, response, status = self.make_request('GET', 'tools')
        self.log_result("Get tools", success, f"Status: {status}" if not success else "")

    def test_kits(self):
        """Test kits"""
        print("\n📦 Testing Kits...")
        
        success, response, status = self.make_request('GET', 'kits')
        self.log_result("Get kits", success, f"Status: {status}" if not success else "")

    def test_deliveries(self):
        """Test deliveries"""
        print("\n🚚 Testing Deliveries...")
        
        success, response, status = self.make_request('GET', 'deliveries')
        self.log_result("Get deliveries", success, f"Status: {status}" if not success else "")

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Cipolatti API Tests...")
        print(f"🌐 Backend URL: {self.base_url}")
        
        # Authentication tests
        must_change_password = self.test_login()
        
        if not self.token:
            print("❌ Cannot proceed without authentication")
            return False
            
        if must_change_password:
            self.test_change_password()
        
        self.test_user_info()
        
        # Core functionality tests
        self.test_dashboard_stats()
        self.test_license_management()
        self.test_companies_crud()
        self.test_employees_crud()
        self.test_epis_crud()
        self.test_stock_alerts()
        self.test_users_management()
        self.test_suppliers()
        self.test_tools()
        self.test_kits()
        self.test_deliveries()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}/{self.tests_run}")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80

def main():
    tester = CipolattiAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())