import type { FormEvent } from "react";
import { useState } from "react";
import type { Route } from "./+types/forgot-password";
import { Form, Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Восстановление пароля | СПРТ" },
    { name: "description", content: "Страница восстановления пароля в СПРТ." },
  ];
}

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <section className="rounded-4 border bg-white p-4 p-md-5 shadow-sm">
      <h1 className="h3 mb-3 text-center">Восстановление пароля</h1>
      <p className="text-center text-secondary mb-4">
        Введите email, и мы отправим инструкцию по сбросу пароля.
      </p>

      <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        <div>
          <label htmlFor="recovery-email" className="form-label">
            Email
          </label>
          <input
            id="recovery-email"
            type="email"
            className="form-control"
            placeholder="your@email.com"
            required
          />
        </div>

        <button type="submit" className="btn btn-dark w-100">
          Отправить ссылку
        </button>
      </Form>

      {isSubmitted && (
        <p className="alert alert-success mt-3 mb-0 py-2">
          Если email существует, письмо для восстановления уже отправлено.
        </p>
      )}

      <p className="text-center mt-4 mb-0">
        <Link to="/login" className="text-decoration-none fw-semibold">
          Назад ко входу
        </Link>
      </p>
    </section>
  );
}
