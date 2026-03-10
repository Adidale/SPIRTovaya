import { useState, type FormEvent } from "react";
import type { Route } from "./+types/login";
import { Form, Link, useNavigate } from "react-router";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login | SPRT" },
    { name: "description", content: "Войти в SPRT." },
  ];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    window.dispatchEvent(new Event("spirtovaya-auth-changed"));
    navigate("/");
  };

  return (
    <section className="rounded-4 border bg-white p-4 p-md-5 shadow">
      <h1 className="h3 mb-3 text-center">Войти</h1>
      <p className="text-center text-secondary mb-4">
        Войдите в ваш аккаунт чтобы продолжить.
      </p>

      <Form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="form-control"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="input-group">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-control"
              placeholder="********"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <i className={showPassword ? "bx bx-show" : "bx bx-hide"}></i>
            </button>
          </div>
        </div>

        <Link to="/forgot-password" className="text-decoration-none fw-semibold text-end">
          Забыли пароль?
        </Link>

        <button type="submit" className="btn btn-dark w-100">
          Войти
        </button>
      </Form>

      <p className="text-center mt-4 mb-0">
        Нет аккаунта?{" "}
        <Link to="/register" className="text-decoration-none fw-semibold">
          Создать аккаунт
        </Link>
      </p>
    </section>
  );
}
