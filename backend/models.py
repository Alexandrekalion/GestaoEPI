from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Table, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    GESTOR = "gestor"
    USER = "user"

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class StockMovementType(str, enum.Enum):
    PURCHASE = "purchase"
    DELIVERY = "delivery"
    RETURN = "return"
    ADJUSTMENT = "adjustment"
    DISCARD = "discard"

class ItemCondition(str, enum.Enum):
    NEW = "new"
    USED = "used"
    DAMAGED = "damaged"

kit_items = Table(
    'kit_items',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('kit_id', Integer, ForeignKey('kits.id', ondelete='CASCADE')),
    Column('epi_id', Integer, ForeignKey('epis.id', ondelete='CASCADE'), nullable=True),
    Column('tool_id', Integer, ForeignKey('tools.id', ondelete='CASCADE'), nullable=True),
    Column('quantity', Integer, default=1)
)

delivery_items = Table(
    'delivery_items',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('delivery_id', Integer, ForeignKey('deliveries.id', ondelete='CASCADE')),
    Column('epi_id', Integer, ForeignKey('epis.id', ondelete='CASCADE'), nullable=True),
    Column('tool_id', Integer, ForeignKey('tools.id', ondelete='CASCADE'), nullable=True),
    Column('kit_id', Integer, ForeignKey('kits.id', ondelete='CASCADE'), nullable=True),
    Column('quantity', Integer, default=1),
    Column('size', String(50), nullable=True),
    Column('batch', String(100), nullable=True),
    Column('qr_code', String(200), nullable=True),
    Column('condition', SQLEnum(ItemCondition), default=ItemCondition.NEW),
    Column('notes', Text, nullable=True)
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    must_change_password = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    employee = relationship('Employee', back_populates='user', foreign_keys=[employee_id])
    audit_logs = relationship('AuditLog', back_populates='user', foreign_keys='AuditLog.user_id')

class PanelLicense(Base):
    __tablename__ = 'panel_license'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_blocked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    history = relationship('LicenseHistory', back_populates='license', cascade='all, delete-orphan')

class LicenseHistory(Base):
    __tablename__ = 'license_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    license_id = Column(Integer, ForeignKey('panel_license.id', ondelete='CASCADE'))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    days_added = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    license = relationship('PanelLicense', back_populates='history')
    user = relationship('User')

class Company(Base):
    __tablename__ = 'companies'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    legal_name = Column(String(255), nullable=False)
    trade_name = Column(String(255), nullable=True)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=True)
    contact_person = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    employees = relationship('Employee', back_populates='company', foreign_keys='Employee.company_id')

class Employee(Base):
    __tablename__ = 'employees'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False, index=True)
    rg = Column(String(20), nullable=True)
    birth_date = Column(DateTime(timezone=True), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    registration_number = Column(String(50), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='SET NULL'), nullable=True)
    department = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    photo_path = Column(String(500), nullable=True)
    facial_consent = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    company = relationship('Company', back_populates='employees', foreign_keys=[company_id])
    user = relationship('User', back_populates='employee', uselist=False, foreign_keys='User.employee_id')
    facial_templates = relationship('FacialTemplate', back_populates='employee', cascade='all, delete-orphan')
    deliveries = relationship('Delivery', back_populates='employee', foreign_keys='Delivery.employee_id')
    documents = relationship('DocumentSignature', back_populates='employee', foreign_keys='DocumentSignature.employee_id')

class FacialTemplate(Base):
    __tablename__ = 'facial_templates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'))
    descriptor_data = Column(Text, nullable=False)
    photo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    employee = relationship('Employee', back_populates='facial_templates')

class Supplier(Base):
    __tablename__ = 'suppliers'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=True)
    contact = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    epis = relationship('EPI', back_populates='supplier', foreign_keys='EPI.supplier_id')

class EPI(Base):
    __tablename__ = 'epis'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    type_category = Column(String(100), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    size = Column(String(50), nullable=True)
    material = Column(String(100), nullable=True)
    ca_number = Column(String(50), nullable=False, index=True)
    ca_validity = Column(DateTime(timezone=True), nullable=True)
    technical_standard = Column(String(100), nullable=True)
    ca_document_path = Column(String(500), nullable=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    invoice_document_path = Column(String(500), nullable=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    quantity_purchased = Column(Integer, default=0)
    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)
    cost_center = Column(String(100), nullable=True)
    cid_field = Column(String(100), nullable=True)
    internal_code = Column(String(100), unique=True, nullable=True, index=True)
    batch = Column(String(100), nullable=True)
    qr_code = Column(String(200), unique=True, nullable=True, index=True)
    storage_location = Column(String(200), nullable=True)
    estimated_life = Column(Integer, nullable=True)
    validity_date = Column(DateTime(timezone=True), nullable=True)
    current_stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    supplier = relationship('Supplier', back_populates='epis', foreign_keys=[supplier_id])
    creator = relationship('User')
    stock_movements = relationship('StockMovement', back_populates='epi', foreign_keys='StockMovement.epi_id')

class Tool(Base):
    __tablename__ = 'tools'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), unique=True, nullable=True, index=True)
    internal_code = Column(String(100), unique=True, nullable=True, index=True)
    qr_code = Column(String(200), unique=True, nullable=True, index=True)
    condition = Column(SQLEnum(ItemCondition), default=ItemCondition.NEW)
    storage_location = Column(String(200), nullable=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    supplier = relationship('Supplier')

class Kit(Base):
    __tablename__ = 'kits'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    epis = relationship('EPI', secondary=kit_items, backref='kits')
    tools = relationship('Tool', secondary=kit_items, backref='kits')

class StockMovement(Base):
    __tablename__ = 'stock_movements'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    movement_type = Column(SQLEnum(StockMovementType), nullable=False)
    epi_id = Column(Integer, ForeignKey('epis.id', ondelete='CASCADE'), nullable=True)
    tool_id = Column(Integer, ForeignKey('tools.id', ondelete='CASCADE'), nullable=True)
    quantity = Column(Integer, nullable=False)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    epi = relationship('EPI', back_populates='stock_movements', foreign_keys=[epi_id])
    tool = relationship('Tool')
    user = relationship('User')

class Delivery(Base):
    __tablename__ = 'deliveries'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'))
    delivery_type = Column(String(50), nullable=False)
    is_return = Column(Boolean, default=False)
    photo_evidence_path = Column(String(500), nullable=True)
    facial_match_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    delivered_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    employee = relationship('Employee', back_populates='deliveries', foreign_keys=[employee_id])
    user = relationship('User', foreign_keys=[delivered_by])
    epis = relationship('EPI', secondary=delivery_items, backref='deliveries')
    tools = relationship('Tool', secondary=delivery_items, backref='deliveries')
    kits = relationship('Kit', secondary=delivery_items, backref='deliveries')

class DocumentTemplate(Base):
    __tablename__ = 'document_templates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(String(20), default='1.0')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    signatures = relationship('DocumentSignature', back_populates='template', foreign_keys='DocumentSignature.template_id')

class DocumentSignature(Base):
    __tablename__ = 'document_signatures'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey('document_templates.id', ondelete='CASCADE'))
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'))
    signature_image_path = Column(String(500), nullable=True)
    signed_document_path = Column(String(500), nullable=True)
    signed_by_user = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    signed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    template = relationship('DocumentTemplate', back_populates='signatures', foreign_keys=[template_id])
    employee = relationship('Employee', back_populates='documents', foreign_keys=[employee_id])
    user = relationship('User')

class ExternalTeam(Base):
    __tablename__ = 'external_teams'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=True)
    responsible_person = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(200), nullable=True)
    service_locations = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    members = relationship('ExternalMember', back_populates='team', cascade='all, delete-orphan')

class ExternalMember(Base):
    __tablename__ = 'external_members'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey('external_teams.id', ondelete='CASCADE'))
    full_name = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=True)
    document_number = Column(String(100), nullable=True)
    photo_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    team = relationship('ExternalTeam', back_populates='members')

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    user = relationship('User', back_populates='audit_logs', foreign_keys=[user_id])
