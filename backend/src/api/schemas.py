from pydantic import BaseModel, EmailStr, Field, model_validator
from typing_extensions import Self

class UserSchemaRegister(BaseModel):
    username: str = Field(min_length=5, max_length=20)
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=20)
    re_password: str = Field(min_length=8, max_length=20)

class UserSchemaLogin(BaseModel):
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=20)

class EvaluateSchema(BaseModel):
    expr: str = Field(..., description='Math expression', min_length=1, max_length=512)
    x_min: float = Field(-10.0, description='Start x point', ge=1, le=10000)
    x_max: float = Field(10.0, description='End x point', ge=1, le=10000)
    n_points: int = Field(100, ge=2, le=1000, description='Number of points')
    var: str = Field('x', description='variable name', max_length=10)

    @model_validator(mode='after')
    def validate(self) -> Self:
        if self.x_max <= self.x_min:
            raise ValueError(f'Start {self.var} point must be bigger than end {self.var} point')