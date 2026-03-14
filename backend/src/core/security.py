import bcrypt
import hashlib
from authx import AuthX
from sqlalchemy.future import select
from db.session import AsyncSessionLocal
from models import User
from .config import config


auth = AuthX(config=config)

class HashHelper:
    @staticmethod
    def get_password_hash(password: str) -> str:
        h = hashlib.sha256(password.encode('utf-8')).digest()
        return bcrypt.hashpw(h, bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        h = hashlib.sha256(plain_password.encode('utf-8')).digest()
        return bcrypt.checkpw(h, hashed_password.encode('utf-8'))

@auth.set_subject_getter
async def get_user_from_db(uid: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).filter(User.id == int(uid)))
        return result.scalars().first()