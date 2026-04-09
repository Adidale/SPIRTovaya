from typing import Self, List
from pydantic import BaseModel, EmailStr, Field, model_validator

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
    x_min: float = Field(-10.0, description='Start x point', ge=-1e6, le=1e6)
    x_max: float = Field(10.0, description='End x point', ge=-1e6, le=1e6)
    n_points: int = Field(100, ge=2, le=1000, description='Number of points')
    var: str = Field('x', description='variable name', max_length=10)

    @model_validator(mode='after')
    def check_x_range(self) -> Self:
        if self.x_max <= self.x_min:
            raise ValueError(f"{self.var}_max must be greater than {self.var}_min")
        return self

# Схема для входных данных
class IntegralRequestSchema(BaseModel):
    expr: str = Field(..., example="x**2 + cos(x)", description="Математическое выражение для интегрирования")
    var: str = Field(default="x", example="x", description="Переменная интегрирования")

# Схема для одного шага решения
class IntegrationStepSchema(BaseModel):
    step_number: int
    rule: str
    description: str
    before: str  # LaTeX строка до преобразования
    after: str   # LaTeX строка после преобразования

# Схема для полного ответа API
class IntegralResponseSchema(BaseModel):
    expression: str
    total_steps: int
    steps: List[IntegrationStepSchema]
    final_answer: str  # Ответ с добавленным + C

class PasswordChangeSchema(BaseModel):
    old_password: str
    new_password: str
    re_new_password: str