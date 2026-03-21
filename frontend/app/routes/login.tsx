import { useState, type FormEvent } from "react";
import type { Route } from "./+types/login";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import { API_BASE_URL, getFastApiErrorDetail } from "~/lib/api";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";

async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = getFastApiErrorDetail(payload);
    if (detail === "unactive user") {
      throw new Error("Аккаунт не подтверждён. Проверьте почту.");
    }
    throw new Error(detail || "Неверный email или пароль.");
  }

  return payload as { message?: string };
}

async function validateSession() {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "GET",
    credentials: "include",
  });
  return response.ok;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Войти | СПРТ" },
    { name: "description", content: "Войти в СПРТ." },
  ];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setSubmitError("Введите email и пароль.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await loginUser(email, password);
      const hasSession = await validateSession();
      if (!hasSession) {
        throw new Error("Не удалось подтвердить сессию. Попробуйте снова.");
      }
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
      window.dispatchEvent(new Event("spirtovaya-auth-changed"));
      navigate("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось войти.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-4 border bg-white p-4 p-md-5 shadow">
      <h1 className="h3 mb-3 text-center">Войти</h1>
      <p className="text-center text-secondary mb-4">
        Войдите в ваш аккаунт чтобы продолжить.
      </p>

      {justRegistered && (
        <div className="alert alert-success py-2 mb-3">
          Аккаунт создан! Проверьте почту для подтверждения, затем войдите.
        </div>
      )}

      <Form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-control"
            placeholder="your@email.com"
            onChange={() => setSubmitError(null)}
          />
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="input-group">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="form-control"
              placeholder="********"
              onChange={() => setSubmitError(null)}
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

        {submitError && (
          <div className="alert alert-danger py-2 mb-0">{submitError}</div>
        )}

        <button type="submit" className="btn btn-dark w-100" disabled={isSubmitting}>
          {isSubmitting ? "Входим..." : "Войти"}
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
