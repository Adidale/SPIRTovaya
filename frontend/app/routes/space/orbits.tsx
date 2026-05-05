import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { MetaFunction } from "react-router";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { API_BASE_URL, getFastApiErrorDetail } from "~/lib/api";

type OrbitalTransferRequest = {
  inclination_1: number;
  inclination_2: number;
  h1: number;
  h2: number;
  force: number;
  impulse: number;
};

type OrbitalTransferResponse = {
  start_data: {
    i1: number;
    h1: number;
    i2: number;
    h2: number;
    force: number;
    impulse: number;
  };
  answer: {
    Mrst: number;
    dV1: number;
    dV2: number;
    dV3: number;
    Mt1: number;
    Mt2: number;
    Mt3: number;
    t1: number;
    t2: number;
    t3: number;
  };
};

type OrbitInput = {
  eccentricity: string;
  h: string;
};

type EngineInput = {
  force: string;
  impulse: string;
};

type TransitionResult = {
  fromOrbit: number;
  toOrbit: number;
  payload: OrbitalTransferResponse;
};

type HoveredOrbit = {
  index: number;
  x: number;
  y: number;
};

const INITIAL_ORBITS: OrbitInput[] = [
  { eccentricity: "", h: "" },
  { eccentricity: "", h: "" },
];

const INITIAL_ENGINE: EngineInput = { force: "", impulse: "" };

const ORBIT_COLORS = ["#ff6b6b", "#ffd166", "#4cc9f0", "#80ed99", "#c77dff", "#f72585"];

function toNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRequestPayload(
  from: OrbitInput,
  to: OrbitInput,
  engine: EngineInput,
): OrbitalTransferRequest | null {
  const inclination_1 = toNumber(from.eccentricity);
  const inclination_2 = toNumber(to.eccentricity);
  const h1 = toNumber(from.h);
  const h2 = toNumber(to.h);
  const force = toNumber(engine.force);
  const impulse = toNumber(engine.impulse);

  if ([inclination_1, inclination_2, h1, h2, force, impulse].some((v) => v === null)) {
    return null;
  }

  return { inclination_1, inclination_2, h1, h2, force, impulse } as OrbitalTransferRequest;
}

function formatNumber(value: number, fractionDigits = 4): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
}

export const meta: MetaFunction = () => {
  return [
    { title: "Орбиты | СПРТ" },
    { name: "description", content: "Калькулятор импульса перехода между орбитами." },
  ];
};

function VarLabel({ base, sub }: { base: string; sub?: string }) {
  return (
    <span>
      <em>{base}</em>
      {sub ? <sub>{sub}</sub> : null}
    </span>
  );
}

export default function OrbitsPage() {
  const [orbits, setOrbits] = useState<OrbitInput[]>(INITIAL_ORBITS);
  const [engine, setEngine] = useState<EngineInput>(INITIAL_ENGINE);
  const [results, setResults] = useState<TransitionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredOrbit, setHoveredOrbit] = useState<HoveredOrbit | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const parsedOrbits = useMemo(
    () =>
      orbits.map((orbit) => ({
        eccentricity: toNumber(orbit.eccentricity),
        h: toNumber(orbit.h),
      })),
    [orbits],
  );

  useEffect(() => {
    const host = canvasRef.current;
    if (!host) return;

    host.innerHTML = "";

    const width = host.clientWidth || 500;
    const height = 280;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ffffff");

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.up.set(0, 1, 0);
    camera.position.set(-11, 0, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.minDistance = 4;
    controls.maxDistance = 26;
    controls.target.set(0, 0, 0);
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(12, 10, 8);
    scene.add(light);

    const earthGeometry = new THREE.SphereGeometry(2, 48, 48);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.45,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);
    const ringObjects: Array<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>> = [];
    parsedOrbits.forEach((orbit, idx) => {
      if (orbit.h === null || orbit.eccentricity === null) return;

      const altitudeScale = Math.max(0.5, orbit.h * 0.004);
      const orbitRadius = 2 + altitudeScale;
      const tilt = THREE.MathUtils.degToRad(orbit.eccentricity);

      const geometry = new THREE.TorusGeometry(orbitRadius, 0.07, 16, 160);
      const material = new THREE.MeshBasicMaterial({
        color: ORBIT_COLORS[idx % ORBIT_COLORS.length],
      });
      const ringMesh = new THREE.Mesh(geometry, material);
      const inclinationDeg = orbit.eccentricity;
      const normalizedMod = Math.abs(inclinationDeg % 90);
      const isMultipleOfNinety = normalizedMod < 1e-6 || Math.abs(normalizedMod - 90) < 1e-6;
      const specialRotationOffset = isMultipleOfNinety ? Math.PI / 2 : 0;
      ringMesh.rotation.x = tilt + Math.PI + specialRotationOffset;
      ringMesh.userData = { orbitIndex: idx, altitudeScale, tilt, orbitRadius };
      scene.add(ringMesh);
      ringObjects.push(ringMesh);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const renderScene = () => renderer.render(scene, camera);
    controls.addEventListener("change", renderScene);
    renderScene();

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersections = raycaster.intersectObjects(ringObjects, false);
      const hit = intersections[0]?.object as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | undefined;

      if (!hit || typeof hit.userData.orbitIndex !== "number") {
        setHoveredOrbit(null);
        renderScene();
        return;
      }

      const tooltipWidth = 220;
      const tooltipHeight = 132;
      const offset = 10;
      const clampedX = Math.min(
        Math.max(event.clientX - bounds.left + offset, 4),
        Math.max(4, bounds.width - tooltipWidth - 4),
      );
      const clampedY = Math.min(
        Math.max(event.clientY - bounds.top + offset, 4),
        Math.max(4, bounds.height - tooltipHeight - 4),
      );

      setHoveredOrbit({
        index: hit.userData.orbitIndex as number,
        x: clampedX,
        y: clampedY,
      });
      renderScene();
    };

    const handlePointerLeave = () => {
      setHoveredOrbit(null);
      renderScene();
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

    const onResize = () => {
      const nextWidth = host.clientWidth || width;
      camera.aspect = nextWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, height);
      renderScene();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("change", renderScene);
      controls.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      ringObjects.forEach((obj) => {
        obj.geometry.dispose();
        obj.material.dispose();
      });
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.dispose();
      scene.clear();
    };
  }, [parsedOrbits]);

  const handleOrbitInputChange =
    (index: number, field: keyof OrbitInput) => (event: ChangeEvent<HTMLInputElement>) => {
      setOrbits((prev) =>
        prev.map((orbit, currentIndex) =>
          currentIndex === index ? { ...orbit, [field]: event.target.value } : orbit,
        ),
      );
    };

  const handleEngineInputChange =
    (field: keyof EngineInput) => (event: ChangeEvent<HTMLInputElement>) => {
      setEngine((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleAddOrbit = () => {
    setOrbits((prev) => [...prev, { eccentricity: "", h: "" }]);
  };

  const handleRemoveLastOrbit = () => {
    setOrbits((prev) => {
      if (prev.length <= 2) return prev;
      return prev.slice(0, -1);
    });
    setResults([]);
    setError(null);
  };

  const handleClear = () => {
    setOrbits(INITIAL_ORBITS);
    setEngine(INITIAL_ENGINE);
    setResults([]);
    setError(null);
  };

  const handleCalculate = async () => {
    if (orbits.length < 2) {
      setError("Добавьте как минимум две орбиты для расчёта.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const collected: TransitionResult[] = [];

      for (let i = 0; i < orbits.length - 1; i++) {
        const payload = toRequestPayload(orbits[i], orbits[i + 1], engine);
        if (!payload) {
          throw new Error(
            `Проверьте значения для орбит ${i + 1} и ${i + 2}, а также параметры двигателя.`,
          );
        }

        const response = await fetch(`${API_BASE_URL}/calculate/orbital-transfers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            getFastApiErrorDetail(data) ||
              `Не удалось выполнить расчёт перехода для орбит ${i + 1} → ${i + 2}.`,
          );
        }

        collected.push({
          fromOrbit: i + 1,
          toOrbit: i + 2,
          payload: data as OrbitalTransferResponse,
        });
      }

      setResults(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-xl mt-4 mb-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="/">Главная</a>
          </li>
          <li className="breadcrumb-item">Космос</li>
          <li className="breadcrumb-item active" aria-current="page">
            Переход между орбитами
          </li>
        </ol>
      </nav>

      <h1 className="fw-bold mb-1 mt-4">Импульс перехода между орбитами</h1>
      <p className="text-secondary mb-4">
        Заполните параметры орбит и двигателя. Расчёт выполняется последовательно: 1→2, 2→3 и далее.
      </p>

      <div className="row g-4 pb-5">
        <div className="col-12 col-xl-7">
          <div className="card border rounded-3 p-4">
            <p className="text-secondary small fw-medium mb-3">Орбиты</p>
            <div className="row g-3">
              {orbits.map((orbit, index) => (
                <div className="col-12 border rounded-3 p-3" key={`orbit-${index}`}>
                  <div className="small fw-medium mb-2 d-flex align-items-center gap-2">
                    <span
                      className="d-inline-block rounded-circle"
                      style={{
                        width: 10,
                        height: 10,
                        backgroundColor: ORBIT_COLORS[index % ORBIT_COLORS.length],
                      }}
                    />
                    Орбита {index + 1}
                  </div>
                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-secondary mb-1">Наклонение, °</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={orbit.eccentricity}
                        onChange={handleOrbitInputChange(index, "eccentricity")}
                        placeholder="Напр. 51.6"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-secondary mb-1">Высота, км</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={orbit.h}
                        onChange={handleOrbitInputChange(index, "h")}
                        placeholder="Напр. 400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr className="my-3" />
            <p className="text-secondary small fw-medium mb-2">Параметры двигателя (общие для всех переходов)</p>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label small text-secondary mb-1">Тяга, кг·км/с²</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={engine.force}
                  onChange={handleEngineInputChange("force")}
                  placeholder="Напр. 1"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-secondary mb-1">Удельный импульс, км/с</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={engine.impulse}
                  onChange={handleEngineInputChange("impulse")}
                  placeholder="Напр. 1"
                />
              </div>
            </div>

            <div className="d-flex gap-2 mt-3 flex-wrap">
              <button className="btn btn-outline-primary" onClick={handleAddOrbit} disabled={loading}>
                Добавить орбиту
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleRemoveLastOrbit}
                disabled={loading || orbits.length <= 2}
              >
                Удалить последнюю орбиту
              </button>
            </div>

            <div className="d-flex align-items-center justify-content-between mt-4 flex-wrap gap-2">
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <button className="btn btn-dark px-4" onClick={handleCalculate} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Вычисляется…
                    </>
                  ) : (
                    "Рассчитать"
                  )}
                </button>
                <button className="btn btn-outline-danger" onClick={handleClear} disabled={loading}>
                  Очистить
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
          </div>

          <div className="card border rounded-3 p-3 mt-3">
            <p className="fw-medium small text-secondary mb-2">3D-визуализация орбит</p>
            <div
              className="position-relative"
              style={{ width: "100%", height: 280, borderRadius: 8, overflow: "hidden" }}
            >
              <div ref={canvasRef} style={{ width: "100%", height: 280 }} />
              {hoveredOrbit && (
                <div
                  className="position-absolute bg-dark text-white rounded px-2 py-1 small"
                  style={{
                    left: hoveredOrbit.x,
                    top: hoveredOrbit.y,
                    maxWidth: 220,
                    pointerEvents: "none",
                    zIndex: 12,
                  }}
                >
                  <div className="fw-semibold">Орбита {hoveredOrbit.index + 1}</div>
                  <div>Высота: {orbits[hoveredOrbit.index]?.h || "—"} км</div>
                  <div>Угол к экватору: {orbits[hoveredOrbit.index]?.eccentricity || "—"}°</div>
                  <div>Тяга: {engine.force || "—"} кг·км/с²</div>
                  <div>Импульс: {engine.impulse || "—"} км/с</div>
                </div>
              )}
            </div>
            <p className="small text-secondary mb-0 mt-2">
              Управление: мышью/жестами - вращение, колесо/щипок - масштаб.
            </p>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          {results.length > 0 ? (
            <>
              {results.map((item) => (
                <div className="card border rounded-3 p-4 mb-3" key={`${item.fromOrbit}-${item.toOrbit}`}>
                  <p className="text-secondary small mb-2 fw-medium">
                    Переход орбиты {item.fromOrbit} → {item.toOrbit}
                  </p>
                  <div className="small d-flex align-items-center gap-2 mb-2">
                    <span
                      className="d-inline-block rounded-circle"
                      style={{
                        width: 10,
                        height: 10,
                        backgroundColor: ORBIT_COLORS[(item.fromOrbit - 1) % ORBIT_COLORS.length],
                      }}
                    />
                    <span>Орбита {item.fromOrbit}</span>
                    <span
                      className="d-inline-block rounded-circle ms-2"
                      style={{
                        width: 10,
                        height: 10,
                        backgroundColor: ORBIT_COLORS[(item.toOrbit - 1) % ORBIT_COLORS.length],
                      }}
                    />
                    <span>Орбита {item.toOrbit}</span>
                  </div>
                  <div className="small d-grid gap-1 mb-3">
                    <div>
                      <VarLabel base="i" sub="1" />: {formatNumber(item.payload.start_data.i1)}°
                    </div>
                    <div>
                      <VarLabel base="h" sub="1" />: {formatNumber(item.payload.start_data.h1)} км
                    </div>
                    <div>
                      <VarLabel base="i" sub="2" />: {formatNumber(item.payload.start_data.i2)}°
                    </div>
                    <div>
                      <VarLabel base="h" sub="2" />: {formatNumber(item.payload.start_data.h2)} км
                    </div>
                    <div>Тяга этапа: {formatNumber(item.payload.start_data.force)} кг·км/с²</div>
                    <div>Импульс этапа: {formatNumber(item.payload.start_data.impulse)} км/с</div>
                  </div>
                  <div className="d-grid gap-2">
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="dV" sub="1" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.dV1)} км/с</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="dV" sub="2" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.dV2)} км/с</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="dV" sub="3" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.dV3)} км/с</strong>
                    </div>
                    <hr className="my-1" />
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="Mt" sub="1" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.Mt1)} кг</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="Mt" sub="2" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.Mt2)} кг</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="Mt" sub="3" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.Mt3)} кг</strong>
                    </div>
                    <hr className="my-1" />
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="t" sub="1" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.t1)} c</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="t" sub="2" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.t2)} c</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="t" sub="3" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.t3)} c</strong>
                    </div>
                    <hr className="my-1" />
                    <div className="d-flex justify-content-between">
                      <span>
                        <VarLabel base="Mrst" />
                      </span>
                      <strong>{formatNumber(item.payload.answer.Mrst)} кг/с</strong>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="card border rounded-3 p-5 text-center text-secondary">
              <i className="bx bx-rocket fs-1 d-block mb-2" />
              <p className="mb-0">Введите параметры орбит и запустите расчёт последовательных переходов</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
