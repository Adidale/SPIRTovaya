чтобы запустить сервер локально откройте папку backend(например через pycharm) и из нее через терминал введите команды:

//создание виртуального окружения python
pyton -m venv venv

//вход в виртуальное окружение
.\venv\Scripts\activate

//установка всех зависимостей из файла requirements.txt
pip install -r requirements.txt

//для запуска локального сервера
python main.py
