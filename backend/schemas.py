from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from models import UserRole, EmployeeStatus, StockMovementType, ItemCondition

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    must_change_password: bool
    role: UserRole

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.USER
    employee_id: Optional[int] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    must_change_password: bool
    employee_id: Optional[int] = None
    created_at: datetime

class CompanyCreate(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    cnpj: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CompanyUpdate(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    legal_name: str
    trade_name: Optional[str] = None
    cnpj: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class EmployeeCreate(BaseModel):
    full_name: str
    cpf: str
    rg: Optional[str] = None
    birth_date: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    registration_number: Optional[str] = None
    company_id: Optional[int] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    facial_consent: bool = False
    notes: Optional[str] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    registration_number: Optional[str] = None
    company_id: Optional[int] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: Optional[EmployeeStatus] = None
    facial_consent: Optional[bool] = None
    notes: Optional[str] = None

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    full_name: str
    cpf: str
    rg: Optional[str] = None
    birth_date: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    registration_number: Optional[str] = None
    company_id: Optional[int] = None
    department: Optional[str] = None
    position: Optional[str] = None
    status: EmployeeStatus
    photo_path: Optional[str] = None
    facial_consent: bool
    notes: Optional[str] = None
    created_at: datetime

class SupplierCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    cnpj: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

class EPICreate(BaseModel):
    name: str
    type_category: str
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    ca_number: str
    ca_validity: Optional[datetime] = None
    technical_standard: Optional[str] = None
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    quantity_purchased: int = 0
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    cost_center: Optional[str] = None
    cid_field: Optional[str] = None
    internal_code: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    storage_location: Optional[str] = None
    estimated_life: Optional[int] = None
    validity_date: Optional[datetime] = None
    current_stock: int = 0
    min_stock: int = 0
    max_stock: Optional[int] = None

class EPIUpdate(BaseModel):
    name: Optional[str] = None
    type_category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    ca_number: Optional[str] = None
    ca_validity: Optional[datetime] = None
    technical_standard: Optional[str] = None
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    quantity_purchased: Optional[int] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    cost_center: Optional[str] = None
    cid_field: Optional[str] = None
    internal_code: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    storage_location: Optional[str] = None
    estimated_life: Optional[int] = None
    validity_date: Optional[datetime] = None
    current_stock: Optional[int] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None

class EPIResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    type_category: str
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    ca_number: str
    ca_validity: Optional[datetime] = None
    technical_standard: Optional[str] = None
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    quantity_purchased: int
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    cost_center: Optional[str] = None
    cid_field: Optional[str] = None
    internal_code: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    storage_location: Optional[str] = None
    estimated_life: Optional[int] = None
    validity_date: Optional[datetime] = None
    current_stock: int
    min_stock: int
    max_stock: Optional[int] = None
    created_at: datetime

class ToolCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    internal_code: Optional[str] = None
    qr_code: Optional[str] = None
    condition: ItemCondition = ItemCondition.NEW
    storage_location: Optional[str] = None
    purchase_date: Optional[datetime] = None
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

class ToolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    internal_code: Optional[str] = None
    qr_code: Optional[str] = None
    condition: ItemCondition
    storage_location: Optional[str] = None
    purchase_date: Optional[datetime] = None
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class KitItemInput(BaseModel):
    epi_id: Optional[int] = None
    tool_id: Optional[int] = None
    quantity: int = 1

class KitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    items: List[KitItemInput] = []

class KitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

class DeliveryItemInput(BaseModel):
    epi_id: Optional[int] = None
    tool_id: Optional[int] = None
    kit_id: Optional[int] = None
    quantity: int = 1
    size: Optional[str] = None
    batch: Optional[str] = None
    qr_code: Optional[str] = None
    condition: ItemCondition = ItemCondition.NEW
    notes: Optional[str] = None

class DeliveryCreate(BaseModel):
    employee_id: int
    delivery_type: str
    is_return: bool = False
    facial_match_score: Optional[float] = None
    notes: Optional[str] = None
    items: List[DeliveryItemInput]

class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    employee_id: int
    delivery_type: str
    is_return: bool
    photo_evidence_path: Optional[str] = None
    facial_match_score: Optional[float] = None
    notes: Optional[str] = None
    delivered_by: Optional[int] = None
    created_at: datetime

class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    movement_type: StockMovementType
    epi_id: Optional[int] = None
    tool_id: Optional[int] = None
    quantity: int
    notes: Optional[str] = None
    created_at: datetime

class LicenseAddDaysRequest(BaseModel):
    days: int
    reason: Optional[str] = None

class LicenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    expires_at: datetime
    is_blocked: bool
    days_remaining: int

class DocumentTemplateCreate(BaseModel):
    name: str
    type: str
    content: str
    version: str = '1.0'

class DocumentTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    type: str
    content: str
    version: str
    is_active: bool
    created_at: datetime

class ExternalTeamCreate(BaseModel):
    company_name: str
    cnpj: Optional[str] = None
    responsible_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    service_locations: Optional[str] = None

class ExternalTeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    company_name: str
    cnpj: Optional[str] = None
    responsible_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    service_locations: Optional[str] = None
    created_at: datetime

class ExternalMemberCreate(BaseModel):
    team_id: int
    full_name: str
    cpf: Optional[str] = None
    document_number: Optional[str] = None
    notes: Optional[str] = None

class ExternalMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    team_id: int
    full_name: str
    cpf: Optional[str] = None
    document_number: Optional[str] = None
    photo_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
