import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sympy import symbols, diff, sympify, latex, lambdify
from .schemas import EvaluateSchema

router = APIRouter(prefix="/calculate", tags=['Calculations'])


@router.get("/derivative")
async def calculate_derivative(expr: str, var: str = "x"):
    try:
        x = symbols(var)
        parsed = sympify(expr)
        derivative = diff(parsed, x)
        data = {
            "plain_text": str(derivative),
            "latex": latex(derivative),
        }
        #сюда добавить строки добавления записи в db

        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@router.get("/evaluate")
async def evaluate_function(data: Annotated[EvaluateSchema, Depends()]):
    try:
        x = symbols(data.var)
        parsed = sympify(data.expr)
        derivative = diff(parsed, x)

        f = lambdify(x, parsed, modules="math")
        df = lambdify(x, derivative, modules="math")

        points = []
        step = (data.x_max - data.x_min) / (data.n_points - 1)
        for i in range(data.n_points):
            x_val = round(data.x_min + step * i, 6)
            entry: dict = {"x": x_val, "y": None, "dy": None}
            try:
                y = float(f(x_val))
                if math.isfinite(y):
                    # Keep large finite values — frontend clips them for singularity display
                    entry["y"] = round(min(max(y, -1e8), 1e8), 6)
            except Exception:
                pass
            try:
                dy = float(df(x_val))
                if math.isfinite(dy):
                    entry["dy"] = round(min(max(dy, -1e8), 1e8), 6)
            except Exception:
                pass
            points.append(entry)

        return {"points": points}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")

