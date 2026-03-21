from pydantic import BaseModel, EmailStr, Field

class UserSchemaRegister(BaseModel):
    username: str = Field(min_length=5, max_length=20)
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=20)
    re_password: str = Field(min_length=8, max_length=20)

class UserSchemaLogin(BaseModel):
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=20)