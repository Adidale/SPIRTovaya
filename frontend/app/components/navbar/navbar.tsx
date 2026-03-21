import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { API_BASE_URL } from "~/lib/api";
import "./navbar.css";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";

type NavChild = { pathname: string; label: string };
type NavLink = { id: string; label: string; icon: string; children: NavChild[] };

const navLinks: NavLink[] = [
  {
    id: "space",
    label: "Космос",
    icon: "bx bx-rocket",
    children: [
      { pathname: "/space/orbits",       label: "Импульс перехода между орбитами" },
      { pathname: "/space/tsiolkovsky", label: "Закон Циолковского" },
      { pathname: "/space/protection",  label: "Защита от микрометеоритов" },
    ],
  },
  {
    id: "calculators",
    label: "Калькуляторы",
    icon: "bx bx-calculator",
    children: [
      { pathname: "/calculators/integral", label: "Интегралы" },
      { pathname: "/calculators/derivative", label: "Производные" },
      { pathname: "/calculators/matrix", label: "Матрицы" },
    ],
  },
  {
    id: "mechanics",
    label: "Термех",
    icon: "bx bx-atom",
    children: [
      { pathname: "/mechanics/2-body-problem", label: "Задача двух тел" },
      { pathname: "/mechanics/3-body-problem", label: "Задача трех тел" },
      { pathname: "/mechanics/relativity", label: "Релятивистская механика"}
    ],
  },
];

export function Navbar() {
  const navigate = useNavigate();
  const offcanvasRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const closeOffcanvas = () => {
    if (!offcanvasRef.current) return;
    import("bootstrap/js/dist/offcanvas").then((mod) => {
      const Offcanvas = mod.default;
      Offcanvas.getInstance(offcanvasRef.current!)?.hide();
    });
  };

  useEffect(() => {
    const syncAuthState = async () => {
      const isStoredAuth = localStorage.getItem(AUTH_STORAGE_KEY) === "true";

      if (!isStoredAuth) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          setIsLoggedIn(true);
          return;
        }

        // Cookie expired or invalid — clear the stale local flag
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        // Network error — trust the local flag
      }

      setIsLoggedIn(isStoredAuth);
    };

    const syncAuthStateListener = () => {
      void syncAuthState();
    };

    void syncAuthState();
    window.addEventListener("storage", syncAuthStateListener);
    window.addEventListener("spirtovaya-auth-changed", syncAuthStateListener);

    return () => {
      window.removeEventListener("storage", syncAuthStateListener);
      window.removeEventListener("spirtovaya-auth-changed", syncAuthStateListener);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsLoggedIn(false);
      window.dispatchEvent(new Event("spirtovaya-auth-changed"));
      navigate("/login");
    }
  };

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark">
      <div className="container">  
        <Link className="navbar-brand fs-3 fw-semibold" to="/">СПРТ</Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvasLg" aria-controls="navbarOffcanvasLg" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="d-none d-md-flex justify-content-between">
          <ul className="navbar-nav align-items-center">
            {navLinks.map((item) => (
              <li className="nav-item" key={item.id}>
                <div className="dropdown">
                  <button
                    className="dropdown-toggle nav-link"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className={item.icon}></i>
                    {item.label}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark mt-2">
                    {item.children.map((child) => (
                      <li key={child.pathname}>
                        <Link to={child.pathname} className="dropdown-item">
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}

            <li className="nav-item">
              {isLoggedIn ? (
                <div className="dropdown">
                  <button className="dropdown-toggle text-white flex-row nav-link ms-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i className="bx bxs-user me-lg-1"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark mt-2">
                    <li>
                      <Link to="/me" className="dropdown-item" title="Profile">
                        Профиль
                      </Link>
                    </li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        Выйти
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <Link to="/login" className="ms-4 btn btn-primary">Войти</Link>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div ref={offcanvasRef} className="offcanvas offcanvas-end text-bg-dark d-md-none" tabIndex={-1} id="navbarOffcanvasLg" aria-labelledby="navbarOffcanvasLgLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="navbarOffcanvasLgLabel">СПРТ</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <ul className="navbar-nav">
            {navLinks.map((item) => (
              <li className="nav-item" key={`mobile-${item.id}`}>
                <button
                  className="nav-link dropdown-toggle w-100 text-start"
                  data-bs-toggle="collapse"
                  data-bs-target={`#mobile-collapse-${item.id}`}
                  aria-expanded="false"
                >
                  <i className={item.icon}></i>
                  {item.label}
                </button>
                <div className="collapse" id={`mobile-collapse-${item.id}`}>
                  <ul className="list-unstyled ps-3">
                    {item.children.map((child) => (
                      <li key={child.pathname}>
                        <Link to={child.pathname} className="nav-link py-1 text-white-50" onClick={closeOffcanvas}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
            <li className="nav-item my-2 d-flex flex-column gap-2">
              {isLoggedIn ? (
                <>
                  <Link to="/me" className="btn btn-outline-light col-12 d-flex align-items-center justify-content-center gap-2" onClick={closeOffcanvas}>
                    <i className="bx bxs-user fs-5"></i>
                    Профиль
                  </Link>
                  <button className="btn btn-outline-danger col-12" onClick={() => { closeOffcanvas(); void handleLogout(); }}>
                    Выйти
                  </button>
                </>
              ) : (
                <Link to="/login" className="btn btn-primary col-12" onClick={closeOffcanvas}>Войти</Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}