from fastapi import APIRouter, HTTPException
from sympy import symbols, diff, sympify, latex

router = APIRouter(prefix="/calculate", tags=['Calculations'])

@router.get("/derivative", name='derivative')
async def calculate(expr: str, var: str = "x"):
    try:
        x = symbols(var)
        parsed_expr = sympify(expr)
        derivative = diff(parsed_expr, x)
        return {
            "plain_text": str(derivative),
            "latex": latex(derivative)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")

