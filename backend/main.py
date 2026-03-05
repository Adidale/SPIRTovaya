from fastapi import FastAPI, HTTPException
from sympy import symbols, diff, sympify, latex
from pydantic import BaseModel
import uvicorn

app = FastAPI()

@app.get("/",name='main page', tags=['Pages'])
async def home() -> dict[str,str]:
    return {
        'text': 'fuck away php, i love python'
    }

@app.get('/contacts', name='contacts page', tags=['Pages'])
async def contacts() -> list[dict[str,str]]:
    return [
        {
            'name':'Motya Pidor',
            'contact':'+7 964 584 77 01'
        },
        {
            'name':'Vlados Pendos',
            'contact':'+7 962 956 31 23'
        },
    ]

@app.get('/about', name='about page', tags=['Pages'])
async def about() -> dict[str,str]:
    return {
        'text':'we gay bros'
    }

posts = [
    {
        'id': 1,
        'title': 'Limp',
        'body': 'chocolate starfish and a hotdog flavored water'
    },
    {
        'id': 2,
        'title': 'Bizkit',
        'body': 'kiss my starfish, yo'
    },
    {
        'id': 3,
        'title': 'Check out my melody',
        'body': 'my way or the highway'
    }
]

@app.get('/items', name='get item list', tags=['Tests'])
async def items() -> list[dict[str,str|int]]:
    return posts

@app.get('/items/{id}', name='get one item', tags=['Tests'])
async def item(id:int) -> dict[str,str|int]:
    for post in posts:
        if post['id'] == id:
            return post
    raise HTTPException(status_code=404, detail='Post now found')

@app.get("/calculate", name='derivative', tags=['Calculations'])
async def calculate(expr: str, var: str = "x"):
    try:
        # 1. Создаем символ переменной (обычно x)
        x = symbols(var)

        # 2. Преобразуем строку в математический объект SymPy
        parsed_expr = sympify(expr)

        # 3. Вычисляем производную
        derivative = diff(parsed_expr, x)

        # 4. Возвращаем результат в двух форматах
        return {
            "plain_text": str(derivative),
            "latex": latex(derivative)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка в выражении: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)