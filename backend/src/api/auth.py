from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from jwt.utils import der_to_raw_signature
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, func
from db.session import get_db, AsyncSessionLocal
from models import User
from core.security import auth, HashHelper
from datetime import datetime, timezone, date
from .schemas import UserSchemaLogin, UserSchemaRegister

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

        try:
            message = MessageSchema(
                subject="Подтверждение регистрации",
                recipients=[data.email],
                body=f"Перейдите по ссылке для активации: {verification_url}",
                subtype=MessageType.html
            )
            fm = FastMail(conf)
            await fm.send_message(message)
        except Exception as e:
            print(f"WARNING: Email could not be sent: {e}")

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
        raise HTTPException(status_code=400, detail=str(e))  # И выведет ошибку в браузере

@router.post('/login')
async def login(data: UserSchemaLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == data.email))
    user = result.scalars().first()

    if not user or not HashHelper.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = auth.create_access_token(uid=str(user.id))
    auth.set_access_cookies(token, response)
    return {"message": "Logged in"}

@router.get("/me")
async def get_me(user: User = Depends(auth.get_current_subject)):
    return {
        "username": user.username,
        'full_name':user.full_name,
        "email": user.email,
        'dob':user.dob,
        'description':user.description,
        'active': user.is_active,
        'created_at': user.created_at
    }

@router.post('/me/edit')
async def edit_me(user: User = Depends(auth.get_current_subject),
                  db: AsyncSession = Depends(get_db),
                  new_fullname: str | None = None,
                  new_dob: date | None = None,
                  new_description: str | None = None):
    try:
        if new_fullname:
            user.full_name = new_fullname
        if new_dob:
            user.dob = new_dob
        if new_description:
            user.description = new_description

        db.add(user)
        await db.commit()

        return {'message': 'User edited'}

    except Exception as e:

        await db.rollback()  # Откатываем транзакцию при ошибке

        print(f"Error: {e}")  # Логируем реальную ошибку

        raise HTTPException(status_code=400, detail="Update failed")

@router.post("/logout")
async def logout(response: Response):
    auth.unset_access_cookies(response)
    return {"message": "Logged out"}


@router.delete("/me/delete", status_code=204)
async def delete_current_user(
        response: Response,
        user: User = Depends(auth.get_current_subject)):
    try:
        async with AsyncSessionLocal() as session:
            # 1. Удаляем пользователя из БД по его ID
            stmt = delete(User).where(User.id == int(user.id))
            result = await session.execute(stmt)

            # Проверяем, был ли найден и удален пользователь
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="User not found")

            await session.commit()

        # 2. Очищаем куки, чтобы сессия закрылась
        auth.unset_access_cookies(response)

        return {'message':"user deleted"}
    except:
        raise HTTPException(status_code=404, detail='You are not in account')