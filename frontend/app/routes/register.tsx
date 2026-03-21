import type { Route } from "./+types/register";
import { useState, type FormEvent } from "react";
import { Form, Link, useNavigate } from "react-router";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type RegisterApiResponse = {
  message?: string;
  detail?: string;
};

async function registerUser(
  username: string,
  email: string,
  password: string,
  rePassword: string
) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      username,
      email,
      password,
      re_password: rePassword,
    }),
  });

  let payload: RegisterApiResponse | null = null;
  try {
    payload = (await response.json()) as RegisterApiResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.detail ?? "Не удалось зарегистрироваться.");
  }

  if (payload?.detail) {
    throw new Error(payload.detail);
  }

  return payload;
}

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!username) {
      setSubmitError("Введите имя пользователя.");
      return;
    }

    if (!email) {
      setSubmitError("Введите email.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Пароли не совпадают.");
      return;
    }

    setPasswordError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await registerUser(username, email, password, confirmPassword);
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
      window.dispatchEvent(new Event("spirtovaya-auth-changed"));
      navigate("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el backend de registro.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-4 border bg-white p-4 p-md-5 shadow-sm">
      <h1 className="h3 mb-3 text-center">Создать аккаунт</h1>
      <p className="text-center text-secondary mb-4">
        Зарегистрируйтесь чтобы начать использовать SPRT.
      </p>

      <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        <div>
          <label htmlFor="username" className="form-label">
            Имя пользователя
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="form-control"
            placeholder="Имя пользователя"
            onChange={() => setSubmitError(null)}
          />
        </div>

        <div>
          <label htmlFor="register-email" className="form-label">
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            className="form-control"
            placeholder="your@email.com"
            onChange={() => setSubmitError(null)}
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
              onChange={() => {
                setPasswordError(null);
                setSubmitError(null);
              }}
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
              onChange={() => {
                setPasswordError(null);
                setSubmitError(null);
              }}
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

        {submitError && <div className="alert alert-danger py-2 mb-0">{submitError}</div>}

        <button type="submit" className="btn btn-dark w-100" disabled={isSubmitting}>
          {isSubmitting ? "Создание аккаунта..." : "Зарегистрироваться"}
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
