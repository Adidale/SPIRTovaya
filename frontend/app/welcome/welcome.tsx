import { useEffect, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Typed from "typed.js";
import './welcome.css';

export function Welcome() {
  const typedTargetRef = useRef<HTMLHeadingElement | null>(null);
  const calculatorLottieUrl = new URL("./animations/Calculator.lottie", import.meta.url).href;
  const stepsLottieUrl = new URL("./animations/Steps.lottie", import.meta.url).href;
  const planetLottieUrl = new URL("./animations/Planet.lottie", import.meta.url).href;
  const graphLottieUrl = new URL("./animations/Analysis.lottie", import.meta.url).href;
  const mechanicsLottieUrl = new URL("./animations/Mechanics.lottie", import.meta.url).href;

  useEffect(() => {
    if (!typedTargetRef.current) return;

    const typed = new Typed(typedTargetRef.current, {
      strings: ["Интегралы", "Матрицы", "Дифференциалы", "Орбиты", "Задачи на импульс", "Задачу 2-х тел", "Задачу 3-х тел",],
      typeSpeed: 55,
      backSpeed: 35,
      backDelay: 1200,
      loop: true,
    });

    return () => {
      typed.destroy();
    };
  }, []);

  return (
    <main className="">
      <div className="col-12 text-bg-dark text-center py-5 mb-5">
        <h1 className="">Поможем решить</h1>
        <h2 className="hero-text">
          <span ref={typedTargetRef}></span>
        </h2>
        <form action="" className="mx-auto my-5 d-flex justify-content-center align-items-center col-6">
          <input type="text" className="form-control" placeholder="Введите тип задачи"/>
          <button className="btn btn-hero ms-2" title="Поиск">
            <i className="bx bx-search fs-5"></i>
          </button>
        </form>
      </div>

      <div className="container pt-5 mb-5">
        <h1 className="text-center">Делаем инженерные задачи более доступным</h1>

        <div className="row my-5 justify-content-center align-items-center">
          
          <div className="col-12 col-md-6 col-lg-4 text-center">
            <DotLottieReact
              className="calculator-lottie mb-3"
              src={calculatorLottieUrl}
              autoplay
              loop
            />
            <h5>Калькуляторы</h5>
            <p>
              Калькуляторы и преобразователи для интегралов, 
              дифференциалов, матриц и многого другого
            </p>
          </div>

          <div className="col-12 col-md-6 col-lg-4 text-center">
            <DotLottieReact
              className="calculator-lottie mb-3"
              src={stepsLottieUrl}
              autoplay
              loop
            />
            <h5>Пошаговые решения</h5>
            <p>
              Получить пошаговое решение для любой математической задачи
            </p>
          </div>

          <div className="col-12 col-md-6 col-lg-4 text-center">
            <DotLottieReact
              className="calculator-lottie mb-3"
              src={planetLottieUrl}
              autoplay
              loop
            />
            <h5>Космос</h5>
            <p>Расчёт импульса для перехода между орбитами, 
              Закон Циолковского, защита от микрометеоритов и многое другое
            </p>
          </div>

          <div className="col-12 col-md-6 col-lg-4 text-center">
            <DotLottieReact
              className="calculator-lottie mb-3"
              src={graphLottieUrl}
              autoplay
              loop
            />
            <h5>Графики</h5>
            <p>
              Стройте графики и анализируйте функции 
              и уравнения с подробным описанием действий
            </p>
          </div>

          <div className="col-12 col-md-6 col-lg-4 text-center">
            <DotLottieReact
              className="calculator-lottie mb-3"
              src={mechanicsLottieUrl}
              autoplay
              loop
            />
            <h5>Термех</h5>
            <p>
              Решение задач на 2-х и 3-х тел, лабораторные 
              работы по термеху и многое другое
            </p>
          </div>
        </div>
      </div>

      <div className="container pt-5 mb-5">
        <h1 className="text-center">Популярные калькуляторы</h1>

        <div className="d-flex flex-column my-5 flex-md-row justify-content-center align-items-center">
          <ul className="list-unstyled col-12 col-md-5 m-0">
            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Калькулятор интегралов
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Калькулятор дифференциалов
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Калькулятор матриц
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Калькулятор задачи 2-х тел
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Калькулятор задачи 3-х тел
              </a>
            </li>
          </ul>

          <ul className="list-unstyled col-12 col-md-5 m-0">
            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Импульс перехода между орбитами
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Закон Циолковского
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Защита от микрометеоритов
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Лабораторные работы по термеху
              </a>
            </li>

            <li className="mb-3">
              <a href="" className="text-decoration-none fs-5 fw-medium text-dark d-flex justify-content-start align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-3 text-success"></i>
                Ревельтивистская механика
              </a>
            </li>
          </ul>
        </div>
      </div>

    </main>
  );
}