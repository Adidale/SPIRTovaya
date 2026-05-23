import { useEffect, useState, type MouseEvent } from "react";
import type { Route } from "./+types/me";
import { useNavigate } from "react-router";
import { API_BASE_URL, getFastApiErrorDetail } from "~/lib/api";
import { AUTH_STORAGE_KEY } from "~/lib/auth";
import {
  deleteSavedCalculation,
  formatEntryPreview,
  getCalculatorPath,
  getTypeTitle,
  SaveAuthError,
  type SavedCalculationEntry,
} from "~/lib/saved-calculations";
import { getLoginRedirectUrl } from "~/lib/auth";
import "./me.css";

type UserProfile = {
  username: string;
  email: string;
  active: boolean;
  last_calc?: SavedCalculationEntry[] | null;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Профиль | СПРТ" },
    { name: "description", content: "Ваш профиль в СПРТ." },
  ];
}

type Tab = "tasks" | "settings";

type EditableFieldProps = {
  label: string;
  type: "text" | "email";
  value: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => Promise<void>;
};

function EditableField({ label, type, value, validate, onSubmit }: EditableFieldProps) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
      setError(null);
    }
  }, [value, isEditing]);

  const handleCancel = () => {
    setDraft(value);
    setError(null);
    setIsEditing(false);
  };

  const handleSubmit = async () => {
    const nextValue = draft.trim();
    const validationError = validate?.(nextValue) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!nextValue || nextValue === value) {
      handleCancel();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(nextValue);
      setIsEditing(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить изменения.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-3">
      <label className="form-label fw-medium">{label}</label>

      <div className="input-group">
        <input
          type={type}
          className={`form-control ${error ? "is-invalid" : ""}`}
          value={draft}
          disabled={!isEditing || isSubmitting}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (!isEditing) return;
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
          }}
        />

        {isEditing ? (
          <>
            <button
              className="btn btn-success"
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              title="Сохранить"
            >
              <i className="bx bx-check"></i>
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              title="Отменить"
            >
              <i className="bx bx-x"></i>
            </button>
          </>
        ) : (
          <button
            className="btn btn-dark"
            type="button"
            onClick={() => setIsEditing(true)}
            title="Редактировать"
          >
            <i className="bx bx-pencil"></i>
          </button>
        )}
      </div>

      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function MePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingCalcIndex, setDeletingCalcIndex] = useState<number | null>(null);
  const [tasksNotice, setTasksNotice] = useState<string | null>(null);

  const fetchProfile = async () => {
    const response = await fetch(`${API_BASE_URL}/me`, {
      credentials: "include",
    });

    if (response.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      navigate("/login");
      return;
    }

    if (!response.ok) {
      throw new Error("Ошибка загрузки профиля.");
    }

    const data = (await response.json()) as UserProfile;
    setUser(data);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        await fetchProfile();
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [navigate]);

  const handleDeleteCalculation = async (index: number, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setTasksNotice(null);
    setDeletingCalcIndex(index);

    try {
      const removedOnServer = await deleteSavedCalculation(index);
      if (removedOnServer) {
        await fetchProfile();
        setTasksNotice(null);
        return;
      }

      setUser((prev) => {
        if (!prev?.last_calc) return prev;
        const next = prev.last_calc.filter((_, i) => i !== index);
        return { ...prev, last_calc: next };
      });
      setTasksNotice(
        "Расчёт убран из списка. Удаление на сервере будет доступно после обновления API.",
      );
    } catch (e) {
      if (e instanceof SaveAuthError) {
        navigate(getLoginRedirectUrl("/me"));
        return;
      }
      setTasksNotice(
        e instanceof Error ? e.message : "Не удалось удалить расчёт.",
      );
    } finally {
      setDeletingCalcIndex(null);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event("spirtovaya-auth-changed"));
      navigate("/login");
    }
  };

  const handleUsernameSave = async (username: string) => {
    const response = await fetch(`${API_BASE_URL}/me/username`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(getFastApiErrorDetail(payload) || "Не удалось обновить имя пользователя.");
    }

    setUser((prev) => (prev ? { ...prev, username } : prev));
  };

  const handleEmailSave = async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/me/email`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(getFastApiErrorDetail(payload) || "Не удалось обновить email.");
    }

    const data = payload as { email: string; active?: boolean };
    setUser((prev) => (prev ? {
      ...prev,
      email: data.email,
      active: typeof data.active === "boolean" ? data.active : prev.active,
    } : prev));
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/me/delete`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok && response.status !== 204) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(getFastApiErrorDetail(payload) || "Не удалось удалить аккаунт.");
      }

      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event("spirtovaya-auth-changed"));
      navigate("/login");
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-dark" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mt-4 mb-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/">Главная</a></li>
          <li className="breadcrumb-item active" aria-current="page">Профиль</li>
        </ol>
      </nav>
      
      <div className="d-flex flex-column flex-md-row align-items-start justify-content-between mt-5">
        <div className="col-12 col-md-3 d-flex flex-column gap-2">
          <button
            className={`btn ${activeTab === "tasks" ? "btn-dark" : "btn-outline-dark"}`}
            onClick={() => setActiveTab("tasks")}
          >
            Мои задачи
          </button>
          <button
            className={`btn ${activeTab === "settings" ? "btn-dark" : "btn-outline-dark"}`}
            onClick={() => setActiveTab("settings")}
          >
            Настройки
          </button>
        </div>

        <div className="col-12 col-md-7 mt-5 mt-md-0 mb-5">
          {activeTab === "tasks" && (
            <>
              <h1>Мои задачи</h1>
              {tasksNotice && (
                <div className="alert alert-info py-2 mt-3 mb-0">{tasksNotice}</div>
              )}
              <div className="mt-4">
                {user.last_calc && user.last_calc.length > 0 ? (
                  <div className="list-group">
                    {user.last_calc.map((entry, index) => (
                      <div
                        key={`${entry.type}-${entry.date}-${index}`}
                        className="list-group-item saved-calc-item d-flex align-items-stretch p-0"
                      >
                        <button
                          type="button"
                          className="saved-calc-item__open btn text-start border-0 flex-grow-1 p-3 rounded-0"
                          onClick={() =>
                            navigate(getCalculatorPath(entry.type), {
                              state: { saved: entry, savedIndex: index },
                            })
                          }
                        >
                          <div className="d-flex justify-content-between align-items-start gap-3 w-100">
                            <div>
                              <div className="fw-semibold">{getTypeTitle(entry.type)}</div>
                              <div className="small text-secondary mt-1">
                                {formatEntryPreview(entry)}
                              </div>
                            </div>
                            <span className="small text-secondary text-nowrap">{entry.date}</span>
                          </div>
                        </button>
                        <div className="saved-calc-item__actions d-flex align-items-center pe-2">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            title="Удалить"
                            disabled={deletingCalcIndex === index}
                            onClick={(event) => void handleDeleteCalculation(index, event)}
                          >
                            {deletingCalcIndex === index ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <i className="bx bx-trash" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-secondary fs-5 mt-5">У вас нет задач</p>
                )}
              </div>
            </>
          )}

          {activeTab === "settings" && (
            <>
              <h1>Настройки</h1>
              <div className="mt-4">
                <div className="">
                  <div className="mb-3">
                    <EditableField
                      label="Имя пользователя"
                      type="text"
                      value={user.username}
                      validate={(value) => {
                        if (value.length < 5) return "Имя пользователя должно содержать минимум 5 символов.";
                        if (value.length > 20) return "Имя пользователя должно содержать максимум 20 символов.";
                        return null;
                      }}
                      onSubmit={handleUsernameSave}
                    />
                  </div>

                  <div className="mb-3">
                    <EditableField
                      label="Email"
                      type="email"
                      value={user.email}
                      validate={(value) => {
                        if (!isValidEmail(value)) return "Введите корректный email.";
                        return null;
                      }}
                      onSubmit={handleEmailSave}
                    />

                    <small className="fw-bold d-block mt-1">
                      Статус: 
                      <span className={` ms-2 badge ${user.active ? "bg-success" : "bg-warning text-dark"}`}>
                        {user.active ? "Активен" : "Не подтверждён"}
                      </span>
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Новый пароль</label>
                    <input type="password" className="form-control" />

                    <label className="form-label fw-medium mt-3">Подтверждение пароля</label>
                    <input type="password" className="form-control" />

                    <button className="btn btn-outline-success w-100 mt-3">
                      Сохранить
                    </button>
                  </div>
                  
                  <hr />
                  
                  <h5 className="fw-semibold text-danger">Зона опасности</h5>
                  <div className="border border-danger p-3 rounded-3 d-flex align-items-center justify-content-between">
                    <div className="col-8">
                      <label className="fw-medium">Удалить аккаунт</label>
                      <hr />
                      <p>После удаления аккаунта восстановить его будет невозможно.</p>
                    </div>

                    <div className="d-flex align-items-center">
                      <button className="btn btn-danger" type="button" onClick={() => setDeleteModalOpen(true)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5">Удаление аккаунта</h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleteLoading}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-0">
                    Это действие необратимо. После удаления аккаунта восстановить его будет невозможно.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleteLoading}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Удаление..." : "Да, я хочу удалить свой аккаунт"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}
