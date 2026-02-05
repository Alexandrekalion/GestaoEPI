from fastapi import Request, HTTPException, status
from sqlalchemy import select
from models import PanelLicense
from database import AsyncSessionLocal
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

EXEMPT_PATHS = [
    '/api/auth/login',
    '/api/',
    '/api/docs',
    '/api/openapi.json',
]

async def check_panel_license(request: Request, call_next):
    if request.url.path in EXEMPT_PATHS or request.url.path.startswith('/api/docs') or request.url.path.startswith('/api/openapi'):
        return await call_next(request)
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PanelLicense).limit(1))
        license = result.scalar_one_or_none()
        
        if license:
            now = datetime.now(timezone.utc)
            if now > license.expires_at:
                logger.warning(f'Tentativa de acesso com painel expirado: {request.url.path}')
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail='Preciso ativar o Painel'
                )
    
    return await call_next(request)
