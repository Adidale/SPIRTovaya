from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, func
from db.session import get_db, AsyncSessionLocal
from models import User
from core.security import auth, HashHelper
from datetime import datetime, timezone, date
from .schemas import (
    EmailUpdateSchema,
    PasswordChangeSchema,
    UserSchemaLogin,
    UserSchemaRegister,
    UsernameUpdateSchema,
)
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType


conf = ConnectionConfig(
    MAIL_USERNAME="sprtcompanyone@gmail.com",
    MAIL_PASSWORD="fdixooochdbywhoa",
    MAIL_FROM="sprtcompanyone@gmail.com",
    MAIL_PORT=465,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_FROM_NAME="SPRTCompany",
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False #временное решение понижающее безопастность системы
)

router = APIRouter(tags=['Users'])

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_DEV_VERIFICATION_LOG = _BACKEND_DIR / "dev_verification_links.txt"


# def _emit_verification_link_dev(email: str, verification_url: str) -> None:
#     """Print verification URL to server console and append to dev_verification_links.txt (gitignored)."""
#     line = f"{datetime.now(timezone.utc).isoformat()} | {email} | {verification_url}\n"
#     print(f"\n[DEV] Verification link for {email}:\n{verification_url}\n", flush=True)
#     try:
#         with _DEV_VERIFICATION_LOG.open("a", encoding="utf-8") as f:
#             f.write(line)
#     except OSError as exc:
#         print(f"[DEV] Could not write {_DEV_VERIFICATION_LOG}: {exc}", flush=True)

@router.post('/register')
async def register(data:UserSchemaRegister,
                   db: AsyncSession = Depends(get_db)):
    # 1. Сначала проверяем, есть ли уже такой email
    result = await db.execute(select(User).filter(User.email == data.email))
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    if data.password == data.re_password:
        hashed_pwd = HashHelper.get_password_hash(data.password)

        new_user = User(username=data.username,
                        email=data.email,
                        hashed_password=hashed_pwd)

        db.add(new_user)
        await db.commit()

        token = auth.create_access_token(uid=str(new_user.id))
        verification_url = f"http://localhost:8000/verify/{token}"
        print(verification_url)

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

        return {
            "message":'massage sent'
        }
    else:
        raise HTTPException(status_code=400, detail='incorrect password or password does not match')

@router.get('/verify/{token}')
async def verify_email(token: str,
                       db: AsyncSession = Depends(get_db)):
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
async def login(data: UserSchemaLogin,
                response: Response,
                db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == data.email))
    user = result.scalars().first()

    if not user or not HashHelper.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="unactive user")

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


@router.patch('/me/username')
async def update_username(
    data: UsernameUpdateSchema,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(auth.get_current_subject),
):
    username = data.username.strip()
    if username == user.username:
        return {"message": "Имя пользователя не изменилось", "username": user.username}

    existing = await db.execute(select(User).filter(User.username == username, User.id != user.id))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")

    user.username = username
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "Имя пользователя обновлено", "username": user.username}

@router.patch('/me/email')
async def update_email(
    data: EmailUpdateSchema,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(auth.get_current_subject),
):
    email = data.email.strip().lower()
    if email == user.email:
        return {"message": "Email не изменился", "email": user.email}

    existing = await db.execute(select(User).filter(User.email == email, User.id != user.id))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    user.email = email
    user.is_active = False
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = auth.create_access_token(uid=str(user.id))
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

    return {
        "message": "Email обновлен. Подтвердите новый адрес.",
        "email": user.email,
        "active": user.is_active,
    }

@router.post('/change-password')
async def change_password(
    data: PasswordChangeSchema,
    response: Response,  # Добавляем response для работы с куками
    db: AsyncSession = Depends(get_db),
    user: User = Depends(auth.get_current_subject)
):
    # 1. Проверяем старый пароль
    if not HashHelper.verify_password(data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Текущий пароль введен неверно")

    # 2. Проверяем совпадение новых паролей
    if data.new_password != data.re_new_password:
        raise HTTPException(status_code=400, detail="Новые пароли не совпадают")

    # 3. Хешируем и сохраняем новый пароль
    user.hashed_password = HashHelper.get_password_hash(data.new_password)
    db.add(user)
    await db.commit()

    # 4. РАЗЛОГИНИВАЕМ пользователя
    # Удаляем access-токен из кук браузера
    auth.unset_access_cookies(response)

    return {
        "message": "Пароль успешно изменен. Пожалуйста, войдите в систему снова с новым паролем."
    }

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