export function Footer() {
  return (
    <footer className="py-5 bg-dark">
      <div className="container">
        <div className="row align-items-start justify-content-between">
          <a href="#" className="col-12 col-md-3 text-decoration-none text-white fs-1 fw-semibold mb-5 mb-md-0">СПРТ</a>

          <ul className="col-12 col-sm-6 col-md-3 list-unstyled">
            <h5 className="fw-semibold mb-4 text-white">Инструменты</h5>

            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Калькулятор интегралов
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Калькулятор дифференциалов
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Калькулятор матриц
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Задачи на 2-х тел
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Задачи на 3-х тел
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Импульс перехода между орбитами
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Закон Циолковского
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Защита от микрометеоритов
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Лабораторные работы по термеху
              </a>
            </li>
            <li>
              <a href="" className="text-decoration-none fw-medium text-white">
                Револютивистская механика
              </a>
            </li>
          </ul>

          <ul className="col-12 col-sm-4 col-md-3 list-unstyled my-5 my-sm-0">
            <h5 className="fw-semibold mb-4 text-white">Команда</h5>

            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                О нас
              </a>
            </li>
            <li>
              <a href="" className="text-decoration-none fw-medium text-white">
                Контакты
              </a>
            </li>
          </ul>

          <ul className="col-12 col-md-3 list-unstyled my-5 my-md-0">
            <h5 className="fw-semibold mb-4 text-white">Документы</h5>
            
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Пользовательское соглашение
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Политика конфиденциальности
              </a>
            </li>
            <li className="mb-3">
              <a href="" className="text-decoration-none fw-medium text-white">
                Политика Cookies
              </a>
            </li>
            <li>
              <a href="" className="text-decoration-none fw-medium text-white">
                Реквизиты компании
              </a>
            </li>
          </ul>
        </div>

        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between text-secondary mt-md-5">
          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between">
            <p className="mb-sm-0 me-lg-4">
              &copy; {new Date().getFullYear()} СПРТ. Все права защищены.
            </p>
            <button className="btn btn-outline-secondary col-12 col-sm-5">
              Настройки cookies
            </button>
          </div>

          <small className="text-secondary text-end mt-3 mt-sm-0">
            Web by <a href="https://adidale.com" target="_blank" rel="noreferrer">Adidale</a>
          </small>
        </div>
      </div>
    </footer>
  );
}
