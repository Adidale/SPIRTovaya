import { useEffect, useState } from "react";
import { Link } from "react-router";
import "./navbar.css";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const navLinks = [
  { id: "space", to: "/?section=space", label: "Космос", icon: "bx bx-rocket" },
  { id: "calculators", to: "/calculators", label: "Калькуляторы", icon: "bx bx-calculator" },
  { id: "mechanics", to: "/?section=mechanics", label: "Термех", icon: "bx bx-atom" },
];

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuthState = async () => {
      const isStoredAuth = localStorage.getItem(AUTH_STORAGE_KEY) === "true";

      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          setIsLoggedIn(true);
          return;
        }
      } catch {
        // Ignore network errors and fallback to local flag.
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

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">  
        <Link className="navbar-brand fs-3 fw-semibold" to="/">SPRT</Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvasLg" aria-controls="navbarOffcanvasLg" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="d-none d-lg-flex justify-content-between">
          <ul className="navbar-nav align-items-center">
            {navLinks.map((item) => (
              <li className="nav-item" key={item.id}>
                <Link to={item.to} className="nav-link">
                  <i className={item.icon}></i>
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="nav-item">
              {isLoggedIn ? (
                <Link to="/" className="ms-4 btn btn-outline-light rounded-circle p-2 d-flex align-items-center justify-content-center" title="Profile">
                  <i className="bx bxs-user fs-4"></i>
                </Link>
              ) : (
                <Link to="/login" className="ms-4 btn btn-primary">Войти</Link>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div className="offcanvas offcanvas-end text-bg-dark d-lg-none" tabIndex={-1} id="navbarOffcanvasLg" aria-labelledby="navbarOffcanvasLgLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="navbarOffcanvasLgLabel">SPRT</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <ul className="navbar-nav">
            {navLinks.map((item) => (
              <li className="nav-item" key={`mobile-${item.id}`}>
                <Link to={item.to} className="nav-link">
                  <i className={item.icon}></i>
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="nav-item my-2">
              {isLoggedIn ? (
                <Link to="/" className="btn btn-outline-light col-12 d-flex align-items-center justify-content-center gap-2">
                  <i className="bx bxs-user fs-5"></i>
                  Profile
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary col-12">Войти</Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}