from database import AsyncSessionLocal, init_db
from models import User, UserRole, PanelLicense
from auth import get_password_hash
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
import asyncio
import logging

logger = logging.getLogger(__name__)

async def seed_database():
    await init_db()
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).filter(User.username == 'administrador'))
        existing_user = result.scalar_one_or_none()
        
        if not existing_user:
            super_admin = User(
                username='administrador',
                email='admin@cipolatti.com',
                hashed_password=get_password_hash('LR1a2b3c4567@'),
                role=UserRole.SUPER_ADMIN,
                must_change_password=True,
                is_active=True
            )
            db.add(super_admin)
            logger.info('Super-administrador criado: administrador')
        
        result = await db.execute(select(PanelLicense).limit(1))
        existing_license = result.scalar_one_or_none()
        
        if not existing_license:
            license = PanelLicense(
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                is_blocked=False
            )
            db.add(license)
            logger.info('Licença do painel criada: 30 dias')
        
        await db.commit()
        logger.info('Seed concluído com sucesso')

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_database())
