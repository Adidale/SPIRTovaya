from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.session import get_db
from models import User
from core.security import auth, HashHelper

router = APIRouter(tags=['Users'])

@router.post('/register')
async def register(username: str, password: str, re_password: str, db: AsyncSession = Depends(get_db)):
    if password == re_password or len(password)<30:
        hashed_pwd = HashHelper.get_password_hash(password)
        new_user = User(username=username, hashed_password=hashed_pwd)
        db.add(new_user)
        await db.commit()
        return {"message": "User created"}
    else:
        return HTTPException(status_code=401, detail='incorrect password or password does not match')

@router.post('/login')
async def login(response: Response, username: str, password: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()

    if not user or not HashHelper.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = auth.create_access_token(uid=str(user.id))
    auth.set_access_cookies(token, response)
    return {"message": "Logged in"}

@router.get("/me")
async def get_me(user: User = Depends(auth.get_current_subject)):
    return {"id": user.id, "username": user.username}

@router.post("/logout")
async def logout(response: Response):
    auth.unset_access_cookies(response)
    return {"message": "Logged out"}
