import type { Route } from "./+types/register";
import { useState, type FormEvent } from "react";
import { Form, Link, useNavigate } from "react-router";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Регистрация | SPRT" },
    { name: "description", content: "Регистрация в SPRT." },
  ];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setPasswordError("Пароли не совпадают.");
      return;
    }

    setPasswordError(null);
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    window.dispatchEvent(new Event("spirtovaya-auth-changed"));
    navigate("/");
  };

  return (
    <section className="rounded-4 border bg-white p-4 p-md-5 shadow-sm">
      <h1 className="h3 mb-3 text-center">Создать аккаунт</h1>
      <p className="text-center text-secondary mb-4">
        Зарегистрируйтесь чтобы начать использовать SPRT.
      </p>

      <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        <div>
          <label htmlFor="name" className="form-label">
            Имя
          </label>
          <input
            id="name"
            type="text"
            className="form-control"
            placeholder="Ваше имя"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="form-label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            className="form-control"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="form-label">
            Password
          </label>
          <div className="input-group">
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              className={`form-control ${passwordError ? "is-invalid" : ""}`}
              placeholder="********"
              onChange={() => setPasswordError(null)}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <i className={showPassword ? "bx bx-show" : "bx bx-hide"}></i>
            </button>
          </div>
          {passwordError && <div className="invalid-feedback d-block">{passwordError}</div>}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm password
          </label>
          <div className="input-group">
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              className={`form-control ${passwordError ? "is-invalid" : ""}`}
              placeholder="********"
              onChange={() => setPasswordError(null)}
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

        <button type="submit" className="btn btn-dark w-100">
          Зарегистрироваться
        </button>
      </Form>

      <p className="text-center mt-4 mb-0">
        Уже есть аккаунт?{" "}
        <Link to="/login" className="text-decoration-none fw-semibold">
          Войти
        </Link>
      </p>
    </section>
  );
}
