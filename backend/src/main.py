from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from db.session import engine, Base
from core.security import auth
from api import auth as auth_api, calc, pages

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Авто-создание таблиц
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

# Обработка ошибок AuthX
auth.handle_errors(app)

# Middleware для обновления токенов
@app.middleware('http')
async def auth_middleware(request: Request, call_next):
    return await auth.implicit_refresh_middleware(request, call_next)

# Подключение роутеров
app.include_router(auth_api.router)
app.include_router(calc.router)
app.include_router(pages.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", reload=True)