import { Link } from "react-router";
import "./navbar.css";

const navLinks = [
  { id: "space", to: "/?section=space", label: "Космос", icon: "bx bx-rocket" },
  { id: "calculators", to: "/calculators", label: "Калькуляторы", icon: "bx bx-calculator" },
  { id: "mechanics", to: "/?section=mechanics", label: "Термех", icon: "bx bx-atom" },
];

export function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">  
        <Link className="navbar-brand" to="/">SPRT</Link>
        
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
              <Link to="/?auth=login" className="mx-2 btn btn-primary">Войти</Link>
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
              <Link to="/?auth=login" className="btn btn-primary col-12">Войти</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}