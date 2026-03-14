from fastapi import APIRouter, HTTPException

router = APIRouter(tags=['Pages'])

@router.get("/",name='main page', tags=['Pages'])
async def home() -> dict[str,str]:
    return {
        'text': 'fuck away php, i love python'
    }

@router.get('/contacts', name='contacts page', tags=['Pages'])
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

@router.get('/about', name='about page', tags=['Pages'])
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

@router.get('/items', name='get item list', tags=['Tests'])
async def items() -> list[dict[str,str|int]]:
    return posts

@router.get('/items/{id}', name='get one item', tags=['Tests'])
async def item(id:int) -> dict[str,str|int]:
    for post in posts:
        if post['id'] == id:
            return post
    raise HTTPException(status_code=404, detail='Post now found')
