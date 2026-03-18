чтобы запустить сервер локально откройте папку backend(например через pycharm) и из нее через терминал введите команды:

//создание виртуального окружения python
pyton -m venv venv

//вход в виртуальное окружение
.\venv\Scripts\activate

//установка всех зависимостей из файла requirements.txt
pip install -r requirements.txt

//для запуска локального сервера
python src/main.py

//после этого переходим в браузер по ссылке http://localhost:8000/docs (стандартная документация FastAPI)


//ЕНДПОИНТЫ
    auth:
    /register(username: str, password: str, re_password: str) - регистрация пользователей в дб
    /login(username: str, password: str) - вход в профиль на сайте
    /me - профиль пользователя (пока что возвращает только id и username)
    /logout - выйти из аккаунта

    shit:
    / - тестовый ендпоинт
    /contacts - тестовый ендпоинт
    /about - тестовый ендпоинт

    calc:
    /derivative(expr: str, var: str = "x") - берет производную отвыражения expr по переменной var, возвращает текст в формате str и LaTeX
    
    
