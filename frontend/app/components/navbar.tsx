import { NavLink } from "react-router";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `nav-link d-flex align-items-center justify-content-center flex-column p-0${isActive ? " active fw-semibold" : ""}`;

export function Navbar() {
  return (
    <nav className="navbar navbar-expand bg-dark navbar-dark border-bottom border-secondary-subtle py-3">
      <div className="container">
        <NavLink to="/" className="navbar-brand d-flex align-items-center fs-4 fw-bold">
          SPRT
        </NavLink>
        <ul className="navbar-nav ms-4">
          <li className="nav-item me-3">
            <NavLink to="/" end className={navLinkClassName}>
              <i className="bx bxs-rocket fs-4" />
              <span className="fw-normal">Орбиты</span>
            </NavLink>
          </li>

          <li className="nav-item me-3">
            <NavLink to="/" end className={navLinkClassName}>
              <i className="bx bx-atom fs-4" />
              <span className="fw-normal">ТерМех</span>
            </NavLink>
          </li>
          
          <li className="nav-item me-3">
            <NavLink to="/" end className={navLinkClassName}>
              <i className="bx bxs-calculator fs-4" />
              <span className="fw-normal">Калькуляторы</span>
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink to="/" end className={navLinkClassName}>
              <i className="bx bxs-wrench fs-4" />
              <span className="fw-normal">Инструменты</span>
            </NavLink>
          </li>
        </ul>

        <ul className="navbar-nav ms-auto">
          <li className="nav-item">
            <NavLink to="/" end className={navLinkClassName}>
              <i className="bx bxs-user fs-4" />
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
