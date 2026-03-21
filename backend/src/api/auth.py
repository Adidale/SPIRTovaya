from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.session import get_db
from models import User
from core.security import auth, HashHelper
from .schemas import *

router = APIRouter(tags=['Users'])

conf = ConnectionConfig(
    MAIL_USERNAME="sprtcompanyone@gmail.com",
    MAIL_PASSWORD="grksfyjtmaizjorx",
    MAIL_FROM="sprtcompanyone@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_FROM_NAME="SPRTCompany",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

@router.post('/register')
async def register(data:UserSchemaRegister, db: AsyncSession = Depends(get_db)):
    if data.password == data.re_password:
        hashed_pwd = HashHelper.get_password_hash(data.password)

        new_user = User(username=data.username,
                        email=data.email,
                        hashed_password=hashed_pwd)

        db.add(new_user)
        await db.commit()

        token = auth.create_access_token(uid=str(new_user.id))
        verification_url = f"http://localhost:8000/verify/{token}"
        message = MessageSchema(
            subject="Подтверждение регистрации",
            recipients=[data.email],
            body=f"Перейдите по ссылке для активации: {verification_url}",
            subtype=MessageType.html
        )
        fm = FastMail(conf)
        await fm.send_message(message)

        return {"message": "Проверьте почту для подтверждения аккаунта"}
    else:
        raise HTTPException(status_code=400, detail='incorrect password or password does not match')


@router.get('/verify/{token}')
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    try:
        # Раскодируем токен и получаем uid
        payload = auth._decode_token(token)
        user_id = int(payload.sub)

        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.is_active:
            return {"message": "Account already verified"}

        user.is_active = True
        await db.commit()

        return {"message": "Email successfully verified!"}

    except ValueError:
        # Если в sub пришла не цифра
        raise HTTPException(status_code=400, detail="Invalid ID format in token")

    except Exception as e:
        print(f"DEBUG: Token error: {e}")  # Это появится в терминале, где запущен FastAPI
        raise HTTPException(status_code=400, detail=str(e))  # И выведет ошибку в браузере

@router.post('/login')
async def login(data: UserSchemaLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == data.email))
    user = result.scalars().first()

    if not user or not HashHelper.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail='unactive user')

    token = auth.create_access_token(uid=str(user.id))
    auth.set_access_cookies(token, response)
    return {"message": "Logged in"}

@router.get("/me")
async def get_me(user: User = Depends(auth.get_current_subject)):
    return {
        "username": user.username,
        "email": user.email,
        'active': user.is_active
    }

@router.post("/logout")
async def logout(response: Response):
    auth.unset_access_cookies(response)
    return {"message": "Logged out"}
