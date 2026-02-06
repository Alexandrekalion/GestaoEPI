from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, close_db, get_db
from schemas import *
from auth import *
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pathlib import Path
from bson import ObjectId
import os
import shutil
import logging

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
    await connect_db()
    from seed import seed_database
    await seed_database()

@app.on_event('shutdown')
async def shutdown_event():
    await close_db()

def doc_to_response(doc, id_field='id'):
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != '_id'}
    result[id_field] = str(doc['_id'])
    return result

# ===================== AUTH =====================

@api_router.get('/')
async def root():
    return {'message': 'Cipolatti API'}

@api_router.post('/auth/login', response_model=TokenResponse)
async def login(request: LoginRequest):
    db = await get_db()
    user = await db.users.find_one({"username": request.username})
    
    if not user or not verify_password(request.password, user['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Credenciais inválidas')
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=400, detail='Usuário inativo')
    
    license_doc = await db.panel_license.find_one({})
    if license_doc:
        now = datetime.now(timezone.utc)
        if now > license_doc['expires_at'] and user['role'] != 'super_admin':
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Preciso ativar o Painel')
    
    access_token = create_access_token(data={'sub': user['username'], 'role': user['role']})
    
    return TokenResponse(
        access_token=access_token,
        token_type='bearer',
        must_change_password=user.get('must_change_password', False),
        role=UserRole(user['role'])
    )

@api_router.post('/auth/change-password')
async def change_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    if not verify_password(request.old_password, current_user['hashed_password']):
        raise HTTPException(status_code=400, detail='Senha antiga incorreta')
    
    await db.users.update_one(
        {"_id": ObjectId(current_user['id'])},
        {"$set": {"hashed_password": get_password_hash(request.new_password), "must_change_password": False}}
    )
    return {'message': 'Senha alterada com sucesso'}

@api_router.get('/auth/me', response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user['id'],
        username=current_user['username'],
        email=current_user['email'],
        role=UserRole(current_user['role']),
        is_active=current_user.get('is_active', True),
        must_change_password=current_user.get('must_change_password', False),
        employee_id=current_user.get('employee_id'),
        created_at=current_user.get('created_at', datetime.now(timezone.utc))
    )

# ===================== USERS =====================

@api_router.get('/users', response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role('super_admin', 'admin'))):
    db = await get_db()
    users = await db.users.find({}).to_list(1000)
    return [UserResponse(**doc_to_response(u)) for u in users]

@api_router.post('/users', response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role('super_admin', 'admin'))):
    db = await get_db()
    existing = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail='Usuário ou email já existe')
    
    new_user = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": get_password_hash(user_data.password),
        "role": user_data.role.value,
        "employee_id": user_data.employee_id,
        "must_change_password": True,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(new_user)
    new_user['_id'] = result.inserted_id
    return UserResponse(**doc_to_response(new_user))

# ===================== COMPANIES =====================

@api_router.get('/companies', response_model=List[CompanyResponse])
async def get_companies(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    companies = await db.companies.find({}).to_list(1000)
    return [CompanyResponse(**doc_to_response(c)) for c in companies]

@api_router.post('/companies', response_model=CompanyResponse)
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    existing = await db.companies.find_one({"cnpj": company_data.cnpj})
    if existing:
        raise HTTPException(status_code=400, detail='CNPJ já cadastrado')
    
    new_company = {**company_data.model_dump(), "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.companies.insert_one(new_company)
    new_company['_id'] = result.inserted_id
    return CompanyResponse(**doc_to_response(new_company))

@api_router.get('/companies/{company_id}', response_model=CompanyResponse)
async def get_company(company_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=404, detail='Empresa não encontrada')
    return CompanyResponse(**doc_to_response(company))

@api_router.patch('/companies/{company_id}', response_model=CompanyResponse)
async def update_company(company_id: str, company_data: CompanyUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in company_data.model_dump(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.now(timezone.utc)
    result = await db.companies.find_one_and_update(
        {"_id": ObjectId(company_id)}, {"$set": update_data}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail='Empresa não encontrada')
    return CompanyResponse(**doc_to_response(result))

# ===================== EMPLOYEES =====================

@api_router.get('/employees', response_model=List[EmployeeResponse])
async def get_employees(current_user: dict = Depends(get_current_user), search: Optional[str] = None):
    db = await get_db()
    query = {}
    if search:
        query = {"$or": [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search, "$options": "i"}}
        ]}
    employees = await db.employees.find(query).to_list(1000)
    return [EmployeeResponse(**doc_to_response(e)) for e in employees]

@api_router.post('/employees', response_model=EmployeeResponse)
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    existing = await db.employees.find_one({"cpf": employee_data.cpf})
    if existing:
        raise HTTPException(status_code=400, detail='CPF já cadastrado')
    
    new_employee = {**employee_data.model_dump(), "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.employees.insert_one(new_employee)
    new_employee['_id'] = result.inserted_id
    return EmployeeResponse(**doc_to_response(new_employee))

@api_router.get('/employees/{employee_id}', response_model=EmployeeResponse)
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    employee = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    return EmployeeResponse(**doc_to_response(employee))

@api_router.patch('/employees/{employee_id}', response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee_data: EmployeeUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in employee_data.model_dump(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.now(timezone.utc)
    result = await db.employees.find_one_and_update(
        {"_id": ObjectId(employee_id)}, {"$set": update_data}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    return EmployeeResponse(**doc_to_response(result))

@api_router.post('/employees/{employee_id}/photo')
async def upload_employee_photo(employee_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    db = await get_db()
    employee = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    
    file_ext = Path(file.filename).suffix
    file_name = f'employee_{employee_id}_{datetime.now(timezone.utc).timestamp()}{file_ext}'
    file_path = UPLOAD_DIR / 'employees' / file_name
    file_path.parent.mkdir(exist_ok=True, parents=True)
    
    with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_path = f'/uploads/employees/{file_name}'
    await db.employees.update_one({"_id": ObjectId(employee_id)}, {"$set": {"photo_path": photo_path}})
    return {'photo_path': photo_path}

# ===================== SUPPLIERS =====================

@api_router.get('/suppliers', response_model=List[SupplierResponse])
async def get_suppliers(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    suppliers = await db.suppliers.find({}).to_list(1000)
    return [SupplierResponse(**doc_to_response(s)) for s in suppliers]

@api_router.post('/suppliers', response_model=SupplierResponse)
async def create_supplier(supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_supplier = {**supplier_data.model_dump(), "created_at": datetime.now(timezone.utc)}
    result = await db.suppliers.insert_one(new_supplier)
    new_supplier['_id'] = result.inserted_id
    return SupplierResponse(**doc_to_response(new_supplier))

# ===================== EPIS =====================

@api_router.get('/epis', response_model=List[EPIResponse])
async def get_epis(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    epis = await db.epis.find({}).to_list(1000)
    return [EPIResponse(**doc_to_response(e)) for e in epis]

@api_router.post('/epis', response_model=EPIResponse)
async def create_epi(epi_data: EPICreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_epi = {**epi_data.model_dump(), "created_by": current_user['id'], "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.epis.insert_one(new_epi)
    new_epi['_id'] = result.inserted_id
    return EPIResponse(**doc_to_response(new_epi))

@api_router.get('/epis/{epi_id}', response_model=EPIResponse)
async def get_epi(epi_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    epi = await db.epis.find_one({"_id": ObjectId(epi_id)})
    if not epi:
        raise HTTPException(status_code=404, detail='EPI não encontrado')
    return EPIResponse(**doc_to_response(epi))

@api_router.patch('/epis/{epi_id}', response_model=EPIResponse)
async def update_epi(epi_id: str, epi_data: EPIUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    update_data = {k: v for k, v in epi_data.model_dump(exclude_unset=True).items()}
    update_data['updated_at'] = datetime.now(timezone.utc)
    result = await db.epis.find_one_and_update({"_id": ObjectId(epi_id)}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail='EPI não encontrado')
    return EPIResponse(**doc_to_response(result))

# ===================== TOOLS =====================

@api_router.get('/tools', response_model=List[ToolResponse])
async def get_tools(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    tools = await db.tools.find({}).to_list(1000)
    return [ToolResponse(**doc_to_response(t)) for t in tools]

@api_router.post('/tools', response_model=ToolResponse)
async def create_tool(tool_data: ToolCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_tool = {**tool_data.model_dump(), "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.tools.insert_one(new_tool)
    new_tool['_id'] = result.inserted_id
    return ToolResponse(**doc_to_response(new_tool))

# ===================== KITS =====================

@api_router.get('/kits', response_model=List[KitResponse])
async def get_kits(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    kits = await db.kits.find({}).to_list(1000)
    return [KitResponse(**doc_to_response(k)) for k in kits]

@api_router.post('/kits', response_model=KitResponse)
async def create_kit(kit_data: KitCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_kit = {
        "name": kit_data.name,
        "description": kit_data.description,
        "items": [item.model_dump() for item in kit_data.items],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.kits.insert_one(new_kit)
    new_kit['_id'] = result.inserted_id
    return KitResponse(**doc_to_response(new_kit))

# ===================== DELIVERIES =====================

@api_router.post('/deliveries', response_model=DeliveryResponse)
async def create_delivery(delivery_data: DeliveryCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    employee = await db.employees.find_one({"_id": ObjectId(delivery_data.employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail='Colaborador não encontrado')
    
    items_list = []
    for item in delivery_data.items:
        item_dict = item.model_dump()
        
        if item.epi_id:
            epi = await db.epis.find_one({"_id": ObjectId(item.epi_id)})
            if epi:
                item_dict['epi_name'] = epi['name']
                stock_change = -item.quantity if not delivery_data.is_return else item.quantity
                await db.epis.update_one({"_id": ObjectId(item.epi_id)}, {"$inc": {"current_stock": stock_change}})
                
                movement = {
                    "movement_type": "return" if delivery_data.is_return else "delivery",
                    "epi_id": item.epi_id,
                    "quantity": item.quantity if delivery_data.is_return else -item.quantity,
                    "created_by": current_user['id'],
                    "created_at": datetime.now(timezone.utc)
                }
                await db.stock_movements.insert_one(movement)
        
        if item.tool_id:
            tool = await db.tools.find_one({"_id": ObjectId(item.tool_id)})
            if tool:
                item_dict['tool_name'] = tool['name']
        
        items_list.append(item_dict)
    
    new_delivery = {
        "employee_id": delivery_data.employee_id,
        "employee_name": employee['full_name'],
        "delivery_type": delivery_data.delivery_type,
        "is_return": delivery_data.is_return,
        "facial_match_score": delivery_data.facial_match_score,
        "notes": delivery_data.notes,
        "items": items_list,
        "delivered_by": current_user['id'],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.deliveries.insert_one(new_delivery)
    new_delivery['_id'] = result.inserted_id
    return DeliveryResponse(**doc_to_response(new_delivery))

@api_router.get('/deliveries', response_model=List[DeliveryResponse])
async def get_deliveries(current_user: dict = Depends(get_current_user), employee_id: Optional[str] = None):
    db = await get_db()
    query = {}
    if employee_id:
        query['employee_id'] = employee_id
    deliveries = await db.deliveries.find(query).sort("created_at", -1).to_list(1000)
    return [DeliveryResponse(**doc_to_response(d)) for d in deliveries]

# ===================== STOCK =====================

@api_router.get('/stock/alerts')
async def get_stock_alerts(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    low_stock = await db.epis.find({"$expr": {"$lte": ["$current_stock", "$min_stock"]}}).to_list(100)
    
    expiry_date = datetime.now(timezone.utc) + timedelta(days=30)
    expiring_soon = await db.epis.find({
        "validity_date": {"$ne": None, "$lte": expiry_date}
    }).to_list(100)
    
    return {
        'low_stock': [{'id': str(e['_id']), 'name': e['name'], 'current_stock': e['current_stock'], 'min_stock': e['min_stock']} for e in low_stock],
        'expiring_soon': [{'id': str(e['_id']), 'name': e['name'], 'validity_date': e.get('validity_date')} for e in expiring_soon]
    }

@api_router.get('/stock/movements')
async def get_stock_movements(current_user: dict = Depends(get_current_user), epi_id: Optional[str] = None):
    db = await get_db()
    query = {}
    if epi_id:
        query['epi_id'] = epi_id
    movements = await db.stock_movements.find(query).sort("created_at", -1).to_list(500)
    return [doc_to_response(m) for m in movements]

# ===================== LICENSE =====================

@api_router.get('/license', response_model=LicenseResponse)
async def get_license(current_user: dict = Depends(require_role('super_admin'))):
    db = await get_db()
    license_doc = await db.panel_license.find_one({})
    if not license_doc:
        raise HTTPException(status_code=404, detail='Licença não encontrada')
    
    now = datetime.now(timezone.utc)
    days_remaining = max(0, (license_doc['expires_at'] - now).days)
    
    return LicenseResponse(
        id=str(license_doc['_id']),
        expires_at=license_doc['expires_at'],
        is_blocked=license_doc.get('is_blocked', False),
        days_remaining=days_remaining
    )

@api_router.post('/license/add-days')
async def add_license_days(request: LicenseAddDaysRequest, current_user: dict = Depends(require_role('super_admin'))):
    db = await get_db()
    license_doc = await db.panel_license.find_one({})
    if not license_doc:
        raise HTTPException(status_code=404, detail='Licença não encontrada')
    
    new_expires = license_doc['expires_at'] + timedelta(days=request.days)
    await db.panel_license.update_one({"_id": license_doc['_id']}, {"$set": {"expires_at": new_expires}})
    
    history = {
        "license_id": str(license_doc['_id']),
        "user_id": current_user['id'],
        "days_added": request.days,
        "reason": request.reason,
        "created_at": datetime.now(timezone.utc)
    }
    await db.license_history.insert_one(history)
    
    return {'message': f'{request.days} dias adicionados com sucesso'}

# ===================== DOCUMENTS =====================

@api_router.get('/document-templates', response_model=List[DocumentTemplateResponse])
async def get_document_templates(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    templates = await db.document_templates.find({"is_active": True}).to_list(100)
    return [DocumentTemplateResponse(**doc_to_response(t)) for t in templates]

@api_router.post('/document-templates', response_model=DocumentTemplateResponse)
async def create_document_template(template_data: DocumentTemplateCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_template = {**template_data.model_dump(), "is_active": True, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.document_templates.insert_one(new_template)
    new_template['_id'] = result.inserted_id
    return DocumentTemplateResponse(**doc_to_response(new_template))

@api_router.delete('/document-templates/{template_id}')
async def delete_document_template(template_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    result = await db.document_templates.delete_one({"_id": ObjectId(template_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Modelo não encontrado')
    return {'message': 'Modelo excluído'}

@api_router.get('/document-signatures', response_model=List[DocumentSignatureResponse])
async def get_document_signatures(current_user: dict = Depends(get_current_user), employee_id: Optional[str] = None):
    db = await get_db()
    query = {}
    if employee_id:
        query['employee_id'] = employee_id
    signatures = await db.document_signatures.find(query).sort("signed_at", -1).to_list(500)
    return [DocumentSignatureResponse(**doc_to_response(s)) for s in signatures]

@api_router.post('/document-signatures', response_model=DocumentSignatureResponse)
async def create_document_signature(sig_data: DocumentSignatureCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    template = await db.document_templates.find_one({"_id": ObjectId(sig_data.template_id)})
    employee = await db.employees.find_one({"_id": ObjectId(sig_data.employee_id)})
    
    if not template or not employee:
        raise HTTPException(status_code=404, detail='Template ou colaborador não encontrado')
    
    signature_path = None
    if sig_data.signature_data:
        import base64
        sig_filename = f'sig_{sig_data.employee_id}_{datetime.now(timezone.utc).timestamp()}.png'
        sig_path = UPLOAD_DIR / 'signatures' / sig_filename
        sig_path.parent.mkdir(exist_ok=True, parents=True)
        
        sig_bytes = base64.b64decode(sig_data.signature_data.split(',')[1] if ',' in sig_data.signature_data else sig_data.signature_data)
        with open(sig_path, 'wb') as f:
            f.write(sig_bytes)
        signature_path = f'/uploads/signatures/{sig_filename}'
    
    new_sig = {
        "template_id": sig_data.template_id,
        "template_name": template['name'],
        "employee_id": sig_data.employee_id,
        "employee_name": employee['full_name'],
        "signature_image_path": signature_path,
        "signed_by_user": current_user['id'],
        "signed_at": datetime.now(timezone.utc)
    }
    result = await db.document_signatures.insert_one(new_sig)
    new_sig['_id'] = result.inserted_id
    return DocumentSignatureResponse(**doc_to_response(new_sig))

# ===================== EXTERNAL TEAMS =====================

@api_router.get('/external-teams', response_model=List[ExternalTeamResponse])
async def get_external_teams(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    teams = await db.external_teams.find({}).to_list(1000)
    return [ExternalTeamResponse(**doc_to_response(t)) for t in teams]

@api_router.post('/external-teams', response_model=ExternalTeamResponse)
async def create_external_team(team_data: ExternalTeamCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_team = {**team_data.model_dump(), "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    result = await db.external_teams.insert_one(new_team)
    new_team['_id'] = result.inserted_id
    return ExternalTeamResponse(**doc_to_response(new_team))

@api_router.get('/external-members', response_model=List[ExternalMemberResponse])
async def get_external_members(current_user: dict = Depends(get_current_user), team_id: Optional[str] = None):
    db = await get_db()
    query = {}
    if team_id:
        query['team_id'] = team_id
    members = await db.external_members.find(query).to_list(1000)
    return [ExternalMemberResponse(**doc_to_response(m)) for m in members]

@api_router.post('/external-members', response_model=ExternalMemberResponse)
async def create_external_member(member_data: ExternalMemberCreate, current_user: dict = Depends(get_current_user)):
    db = await get_db()
    new_member = {**member_data.model_dump(), "created_at": datetime.now(timezone.utc)}
    result = await db.external_members.insert_one(new_member)
    new_member['_id'] = result.inserted_id
    return ExternalMemberResponse(**doc_to_response(new_member))

# ===================== DASHBOARD =====================

@api_router.get('/dashboard/stats')
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    db = await get_db()
    
    active_employees = await db.employees.count_documents({"status": "active"})
    total_epis = await db.epis.count_documents({})
    low_stock_count = await db.epis.count_documents({"$expr": {"$lte": ["$current_stock", "$min_stock"]}})
    
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_deliveries = await db.deliveries.count_documents({
        "is_return": False,
        "created_at": {"$gte": thirty_days_ago}
    })
    
    return {
        'active_employees': active_employees,
        'total_epis': total_epis,
        'low_stock_count': low_stock_count,
        'recent_deliveries': recent_deliveries
    }

app.include_router(api_router)
