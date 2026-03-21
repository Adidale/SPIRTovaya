from pydantic_settings import BaseSettings, SettingsConfigDict
from authx import AuthXConfig

config = AuthXConfig( # Конфигурация AuthX
    JWT_SECRET_KEY='=@{tzC^#{cURTx6czfcG5wZChy{&]07txQW)kKsX!n',
    JWT_ACCESS_COOKIE_NAME="access_token",
    JWT_TOKEN_LOCATION=['cookies'],
    JWT_COOKIE_CSRF_PROTECT=False,
    JWT_COOKIE_SECURE=False,
    JWT_COOKIE_SAMESITE="lax",
    JWT_ACCESS_TOKEN_EXPIRES=60 * 60 * 24,  # 24 hours in seconds
)

