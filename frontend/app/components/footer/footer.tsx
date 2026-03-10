export function Footer() {
  return (
    <footer className="py-5 container">
      <div className="row align-items-start justify-content-between">
        <a href="#" className="col-12 col-md-3 text-decoration-none text-dark fs-1 fw-semibold mb-5 mb-md-0">SPRT</a>

        <ul className="col-12 col-sm-6 col-md-3 list-unstyled">
          <h5 className="fw-semibold mb-4">Инструменты для обучения</h5>

          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Калькулятор интегралов
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Калькулятор дифференциалов
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Калькулятор матриц
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Задачи на 2-х тел
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Задачи на 3-х тел
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Импульс перехода между орбитами
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Закон Циолковского
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Защита от микрометеоритов
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Лабораторные работы по термеху
            </a>
          </li>
          <li>
            <a href="" className="text-decoration-none fw-medium text-dark">
              Револютивистская механика
            </a>
          </li>
        </ul>

        <ul className="col-12 col-sm-4 col-md-3 list-unstyled my-5 my-sm-0">
          <h5 className="fw-semibold mb-4">Компания</h5>

          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              О нас
            </a>
          </li>
          <li>
            <a href="" className="text-decoration-none fw-medium text-dark">
              Контакты
            </a>
          </li>
        </ul>

        <ul className="col-12 col-md-3 list-unstyled my-5 my-md-0">
          <h5 className="fw-semibold mb-4">Юридическая информация</h5>
          
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Пользовательское соглашение
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Политика конфиденциальности
            </a>
          </li>
          <li className="mb-3">
            <a href="" className="text-decoration-none fw-medium text-dark">
              Политика Cookies
            </a>
          </li>
          <li>
            <a href="" className="text-decoration-none fw-medium text-dark">
              Реквизиты компании
            </a>
          </li>
        </ul>
      </div>

      <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between text-secondary mt-md-5">
        <p className="mb-sm-0">
          &copy; {new Date().getFullYear()} SPRT. Все права защищены.
        </p>
        <button className="btn btn-outline-secondary">
          Настройки cookies
        </button>
      </div>
    </footer>
  );
}
