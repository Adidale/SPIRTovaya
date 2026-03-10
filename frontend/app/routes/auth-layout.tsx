import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <main className="d-flex align-items-center justify-content-center min-vh-100 min-vw-100">
      <div className="col-11 col-md-8 col-lg-6">
        <Outlet />
      </div>
    </main>
  );
}
