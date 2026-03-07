export function Welcome() {
  return (
    <main className="container py-5">
      <div className="row justify-content-center align-items-stretch">
          
          <div className="col-12 col-lg-6 pe-lg-2 p-0 mb-lg-4">
            <div className="card col-12 p-0">
              <h5 className="card-header">Калькуляторы</h5>
              <div className="card-body">
                <ul className="bullet-list">
                  <li><a href="/?section=integrals">Интегралы</a></li>
                  <li><a href="/?section=derivatives">Дифференциалы</a></li>
                  <li><a href="/?section=matrices">Матрицы</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6 d-flex ps-lg-2 p-0 my-4 my-lg-0 mb-lg-4">
            <div className="card col-12 p-0 align-self-stretch">
              <h5 className="card-header">Космос</h5>
              <div className="card-body">
                <ul className="bullet-list">
                  <li><a href="/?section=impulse">Расчёт импульса</a></li>
                  <li><a href="/?section=micro">Расчёт толщины защиты от микрометеоритов</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card col-12 p-0">
            <h5 className="card-header">Термех</h5>
            <div className="card-body">
              <ul className="bullet-list">
                <li><a href="/?section=2body">Задача 2-х тел</a></li>
                <li><a href="/?section=3body">Задача 3-х тел</a></li>
              </ul>
            </div>
          </div>

      </div>
    </main>
  );
}