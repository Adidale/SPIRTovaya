import { useEffect, useState } from "react";
import type { Route } from "./+types/me";
import { Link, useNavigate } from "react-router";
import { API_BASE_URL } from "~/lib/api";

const AUTH_STORAGE_KEY = "spirtovaya-authenticated";

type UserProfile = {
  username: string;
  email: string;
  active: boolean;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Профиль | СПРТ" },
    { name: "description", content: "Ваш профиль в СПРТ." },
  ];
}

type Tab = "tasks" | "settings";

export default function MePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          navigate("/login");
          return;
        }

        if (!response.ok) throw new Error("Error al cargar el perfil.");

        const data = (await response.json()) as UserProfile;
        setUser(data);
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [navigate]);

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
              <div className="row mt-5">
                <p className="text-center text-secondary fs-5">У вас нет задач</p>
              </div>
            </>
          )}

          {activeTab === "settings" && (
            <>
              <h1>Настройки</h1>
              <div className="mt-4">
                <div className="">
                  <div className="mb-3">
                    <label className="form-label fw-medium">Имя пользователя</label>

                    <div className="input-group">
                      <input type="text" className="form-control" defaultValue={user.username} disabled />
                      <button className="btn btn-dark">
                        <i className="bx bx-pencil"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Email</label>

                    <div className="input-group">
                      <input type="email" className="form-control" defaultValue={user.email} disabled />
                      <button className="btn btn-dark">
                        <i className="bx bx-pencil"></i>
                      </button>
                    </div>

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
                      <button className="btn btn-danger">
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
    </div>
  );
}
