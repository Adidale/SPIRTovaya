from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from db.session import engine, Base
from core.security import auth
from api import auth as auth_api, calc, pages
from fastapi.middleware.cors import CORSMiddleware
import models  # noqa: F401 - ensures tables are registered in Base.metadata

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Авто-создание таблиц
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Обработка ошибок AuthX
auth.handle_errors(app)

# Public routes that don't need JWT refresh
PUBLIC_PATHS = {"/register", "/login", "/docs", "/openapi.json", "/redoc",
                "/calculate/derivative", "/calculate/evaluate"}

# Middleware для обновления токенов
@app.middleware('http')
async def auth_middleware(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/verify"):
        return await call_next(request)
    try:
        return await auth.implicit_refresh_middleware(request, call_next)
    except Exception:
        return await call_next(request)

# Подключение роутеров
app.include_router(auth_api.router)
app.include_router(calc.router)
app.include_router(pages.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", reload=True)