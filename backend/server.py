from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func
from database import get_db, init_db
from models import *
from schemas import *
from auth import *
from middleware import check_panel_license
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pathlib import Path
import os
import shutil
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title='Cipolatti API')
api_router = APIRouter(prefix='/api')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR)), name='uploads')

@app.on_event('startup')
async def startup_event():
    await init_db()
    from seed import seed_database
    await seed_database()

@api_router.get('/')
async def root():
    return {'message': 'Cipolatti API'}

@api_router.post('/auth/login', response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == request.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Credenciais inválidas'
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail='Usuário inativo')
    
    result = await db.execute(select(PanelLicense).limit(1))
    license = result.scalar_one_or_none()
    
    if license:
        now = datetime.now(timezone.utc)
        if now > license.expires_at and user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Preciso ativar o Painel'
            )
    
    access_token = create_access_token(data={'sub': user.username, 'role': user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        token_type='bearer',
        must_change_password=user.must_change_password,
        role=user.role
    )

@api_router.post('/auth/change-password')
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail='Senha antiga incorreta')
    
    current_user.hashed_password = get_password_hash(request.new_password)
    current_user.must_change_password = False
    await db.commit()
    
    return {'message': 'Senha alterada com sucesso'}

@api_router.get('/auth/me', response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get('/users', response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users

@api_router.post('/users', response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(
        or_(User.username == user_data.username, User.email == user_data.email)
    ))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail='Usuário ou email já existe')
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        employee_id=user_data.employee_id,
        must_change_password=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

@api_router.patch('/users/{user_id}', response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    return user

@api_router.get('/companies', response_model=List[CompanyResponse])
async def get_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Company))
    companies = result.scalars().all()
    return companies

@api_router.post('/companies', response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Company).filter(Company.cnpj == company_data.cnpj))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail='CNPJ já cadastrado')
    
    new_company = Company(**company_data.model_dump())
    db.add(new_company)
    await db.commit()
    await db.refresh(new_company)
    return new_company

@api_router.get('/companies/{company_id}', response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Company).filter(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail='Empresa não encontrada')
    return company

@api_router.patch('/companies/{company_id}', response_model=CompanyResponse)
async def update_company(
    company_id: int,
    company_data: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Company).filter(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail='Empresa não encontrada')
    
    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    await db.commit()
    await db.refresh(company)
    return company

@api_router.get('/employees', response_model=List[EmployeeResponse])
async def get_employees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = None
):
    query = select(Employee)
    if search:
        query = query.filter(
            or_(
                Employee.full_name.ilike(f'%{search}%'),
                Employee.cpf.ilike(f'%{search}%')
            )
        )
    result = await db.execute(query)
    employees = result.scalars().all()
    return employees

@api_router.post('/employees', response_model=EmployeeResponse)
async def create_employee(
    employee_data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Employee).filter(Employee.cpf == employee_data.cpf))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail='CPF já cadastrado')
    
    new_employee = Employee(**employee_data.model_dump())
    db.add(new_employee)
    await db.commit()
    await db.refresh(new_employee)
    return new_employee

@api_router.get('/employees/{employee_id}', response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Employee).filter(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    return employee

@api_router.patch('/employees/{employee_id}', response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Employee).filter(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    
    update_data = employee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    await db.commit()
    await db.refresh(employee)
    return employee

@api_router.post('/employees/{employee_id}/photo')
async def upload_employee_photo(
    employee_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Employee).filter(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    
    file_ext = Path(file.filename).suffix
    file_name = f'employee_{employee_id}_{datetime.now(timezone.utc).timestamp()}{file_ext}'
    file_path = UPLOAD_DIR / 'employees' / file_name
    file_path.parent.mkdir(exist_ok=True, parents=True)
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    employee.photo_path = f'/uploads/employees/{file_name}'
    await db.commit()
    
    return {'photo_path': employee.photo_path}

@api_router.post('/employees/{employee_id}/facial-template')
async def save_facial_template(
    employee_id: int,
    descriptor: str = Form(...),
    file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Employee).filter(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    
    photo_path = None
    if file:
        file_ext = Path(file.filename).suffix
        file_name = f'facial_{employee_id}_{datetime.now(timezone.utc).timestamp()}{file_ext}'
        file_path = UPLOAD_DIR / 'facial' / file_name
        file_path.parent.mkdir(exist_ok=True, parents=True)
        
        with file_path.open('wb') as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        photo_path = f'/uploads/facial/{file_name}'
    
    template = FacialTemplate(
        employee_id=employee_id,
        descriptor_data=descriptor,
        photo_path=photo_path
    )
    db.add(template)
    await db.commit()
    
    return {'message': 'Template facial salvo'}

@api_router.get('/employees/{employee_id}/facial-templates')
async def get_facial_templates(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(FacialTemplate).filter(FacialTemplate.employee_id == employee_id)
    )
    templates = result.scalars().all()
    return [{'id': t.id, 'descriptor': t.descriptor_data, 'photo_path': t.photo_path} for t in templates]

@api_router.get('/suppliers', response_model=List[SupplierResponse])
async def get_suppliers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Supplier))
    suppliers = result.scalars().all()
    return suppliers

@api_router.post('/suppliers', response_model=SupplierResponse)
async def create_supplier(
    supplier_data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_supplier = Supplier(**supplier_data.model_dump())
    db.add(new_supplier)
    await db.commit()
    await db.refresh(new_supplier)
    return new_supplier

@api_router.get('/epis', response_model=List[EPIResponse])
async def get_epis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EPI))
    epis = result.scalars().all()
    return epis

@api_router.post('/epis', response_model=EPIResponse)
async def create_epi(
    epi_data: EPICreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_epi = EPI(**epi_data.model_dump(), created_by=current_user.id)
    db.add(new_epi)
    await db.commit()
    await db.refresh(new_epi)
    return new_epi

@api_router.get('/epis/{epi_id}', response_model=EPIResponse)
async def get_epi(
    epi_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EPI).filter(EPI.id == epi_id))
    epi = result.scalar_one_or_none()
    if not epi:
        raise HTTPException(status_code=404, detail='EPI não encontrado')
    return epi

@api_router.patch('/epis/{epi_id}', response_model=EPIResponse)
async def update_epi(
    epi_id: int,
    epi_data: EPIUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EPI).filter(EPI.id == epi_id))
    epi = result.scalar_one_or_none()
    if not epi:
        raise HTTPException(status_code=404, detail='EPI não encontrado')
    
    update_data = epi_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(epi, field, value)
    
    await db.commit()
    await db.refresh(epi)
    return epi

@api_router.get('/tools', response_model=List[ToolResponse])
async def get_tools(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Tool))
    tools = result.scalars().all()
    return tools

@api_router.post('/tools', response_model=ToolResponse)
async def create_tool(
    tool_data: ToolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_tool = Tool(**tool_data.model_dump())
    db.add(new_tool)
    await db.commit()
    await db.refresh(new_tool)
    return new_tool

@api_router.get('/kits', response_model=List[KitResponse])
async def get_kits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Kit))
    kits = result.scalars().all()
    return kits

@api_router.post('/kits', response_model=KitResponse)
async def create_kit(
    kit_data: KitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_kit = Kit(name=kit_data.name, description=kit_data.description)
    db.add(new_kit)
    await db.flush()
    
    for item in kit_data.items:
        await db.execute(
            kit_items.insert().values(
                kit_id=new_kit.id,
                epi_id=item.epi_id,
                tool_id=item.tool_id,
                quantity=item.quantity
            )
        )
    
    await db.commit()
    await db.refresh(new_kit)
    return new_kit

@api_router.post('/deliveries', response_model=DeliveryResponse)
async def create_delivery(
    delivery_data: DeliveryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_delivery = Delivery(
        employee_id=delivery_data.employee_id,
        delivery_type=delivery_data.delivery_type,
        is_return=delivery_data.is_return,
        facial_match_score=delivery_data.facial_match_score,
        notes=delivery_data.notes,
        delivered_by=current_user.id
    )
    db.add(new_delivery)
    await db.flush()
    
    for item in delivery_data.items:
        await db.execute(
            delivery_items.insert().values(
                delivery_id=new_delivery.id,
                epi_id=item.epi_id,
                tool_id=item.tool_id,
                kit_id=item.kit_id,
                quantity=item.quantity,
                size=item.size,
                batch=item.batch,
                qr_code=item.qr_code,
                condition=item.condition,
                notes=item.notes
            )
        )
        
        if not delivery_data.is_return:
            if item.epi_id:
                result = await db.execute(select(EPI).filter(EPI.id == item.epi_id))
                epi = result.scalar_one_or_none()
                if epi:
                    epi.current_stock -= item.quantity
                    movement = StockMovement(
                        movement_type=StockMovementType.DELIVERY,
                        epi_id=item.epi_id,
                        quantity=-item.quantity,
                        reference_id=new_delivery.id,
                        reference_type='delivery',
                        created_by=current_user.id
                    )
                    db.add(movement)
        else:
            if item.epi_id:
                result = await db.execute(select(EPI).filter(EPI.id == item.epi_id))
                epi = result.scalar_one_or_none()
                if epi:
                    epi.current_stock += item.quantity
                    movement = StockMovement(
                        movement_type=StockMovementType.RETURN,
                        epi_id=item.epi_id,
                        quantity=item.quantity,
                        reference_id=new_delivery.id,
                        reference_type='return',
                        created_by=current_user.id
                    )
                    db.add(movement)
    
    await db.commit()
    await db.refresh(new_delivery)
    return new_delivery

@api_router.get('/deliveries', response_model=List[DeliveryResponse])
async def get_deliveries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_id: Optional[int] = None
):
    query = select(Delivery).order_by(desc(Delivery.created_at))
    if employee_id:
        query = query.filter(Delivery.employee_id == employee_id)
    result = await db.execute(query)
    deliveries = result.scalars().all()
    return deliveries

@api_router.get('/stock/alerts')
async def get_stock_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(EPI).filter(EPI.current_stock <= EPI.min_stock)
    )
    low_stock = result.scalars().all()
    
    result = await db.execute(
        select(EPI).filter(
            and_(
                EPI.validity_date.isnot(None),
                EPI.validity_date <= datetime.now(timezone.utc) + timedelta(days=30)
            )
        )
    )
    expiring_soon = result.scalars().all()
    
    return {
        'low_stock': [{'id': e.id, 'name': e.name, 'current_stock': e.current_stock, 'min_stock': e.min_stock} for e in low_stock],
        'expiring_soon': [{'id': e.id, 'name': e.name, 'validity_date': e.validity_date} for e in expiring_soon]
    }

@api_router.get('/license', response_model=LicenseResponse)
async def get_license(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN))
):
    result = await db.execute(select(PanelLicense).limit(1))
    license = result.scalar_one_or_none()
    if not license:
        raise HTTPException(status_code=404, detail='Licença não encontrada')
    
    now = datetime.now(timezone.utc)
    days_remaining = max(0, (license.expires_at - now).days)
    
    return LicenseResponse(
        id=license.id,
        expires_at=license.expires_at,
        is_blocked=license.is_blocked,
        days_remaining=days_remaining
    )

@api_router.post('/license/add-days')
async def add_license_days(
    request: LicenseAddDaysRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN))
):
    result = await db.execute(select(PanelLicense).limit(1))
    license = result.scalar_one_or_none()
    if not license:
        raise HTTPException(status_code=404, detail='Licença não encontrada')
    
    license.expires_at = license.expires_at + timedelta(days=request.days)
    
    history = LicenseHistory(
        license_id=license.id,
        user_id=current_user.id,
        days_added=request.days,
        reason=request.reason
    )
    db.add(history)
    
    await db.commit()
    
    return {'message': f'{request.days} dias adicionados com sucesso'}

@api_router.get('/license/history')
async def get_license_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN))
):
    result = await db.execute(
        select(LicenseHistory).order_by(desc(LicenseHistory.created_at)).limit(50)
    )
    history = result.scalars().all()
    return [
        {
            'id': h.id,
            'days_added': h.days_added,
            'reason': h.reason,
            'created_at': h.created_at
        }
        for h in history
    ]

@api_router.get('/document-templates', response_model=List[DocumentTemplateResponse])
async def get_document_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(DocumentTemplate).filter(DocumentTemplate.is_active == True))
    templates = result.scalars().all()
    return templates

@api_router.post('/document-templates', response_model=DocumentTemplateResponse)
async def create_document_template(
    template_data: DocumentTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_template = DocumentTemplate(**template_data.model_dump())
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return new_template

@api_router.delete('/document-templates/{template_id}')
async def delete_document_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(DocumentTemplate).filter(DocumentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail='Modelo não encontrado')
    
    await db.delete(template)
    await db.commit()
    return {'message': 'Modelo excluído'}

@api_router.get('/external-teams', response_model=List[ExternalTeamResponse])
async def get_external_teams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ExternalTeam))
    teams = result.scalars().all()
    return teams

@api_router.post('/external-teams', response_model=ExternalTeamResponse)
async def create_external_team(
    team_data: ExternalTeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_team = ExternalTeam(**team_data.model_dump())
    db.add(new_team)
    await db.commit()
    await db.refresh(new_team)
    return new_team

@api_router.get('/external-members', response_model=List[ExternalMemberResponse])
async def get_external_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    team_id: Optional[int] = None
):
    query = select(ExternalMember)
    if team_id:
        query = query.filter(ExternalMember.team_id == team_id)
    result = await db.execute(query)
    members = result.scalars().all()
    return members

@api_router.post('/external-members', response_model=ExternalMemberResponse)
async def create_external_member(
    member_data: ExternalMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_member = ExternalMember(**member_data.model_dump())
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    return new_member

@api_router.get('/dashboard/stats')
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(func.count(Employee.id)).filter(Employee.status == EmployeeStatus.ACTIVE))
    active_employees = result.scalar()
    
    result = await db.execute(select(func.count(EPI.id)))
    total_epis = result.scalar()
    
    result = await db.execute(select(func.count(EPI.id)).filter(EPI.current_stock <= EPI.min_stock))
    low_stock_count = result.scalar()
    
    result = await db.execute(select(func.count(Delivery.id)).filter(
        and_(
            Delivery.is_return == False,
            Delivery.created_at >= datetime.now(timezone.utc) - timedelta(days=30)
        )
    ))
    recent_deliveries = result.scalar()
    
    return {
        'active_employees': active_employees,
        'total_epis': total_epis,
        'low_stock_count': low_stock_count,
        'recent_deliveries': recent_deliveries
    }

app.include_router(api_router)
