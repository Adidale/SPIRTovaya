import { useState, useRef, useEffect, useCallback } from "react";
import type { Route } from "./+types/integral";
import { useLocation, useNavigate } from "react-router";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { API_BASE_URL, getFastApiErrorDetail } from "~/lib/api";
import { isAuthenticatedLocally, getLoginRedirectUrl } from "~/lib/auth";
import {
  getCalculationCredentials,
  getRestoreSessionKey,
  type PersistCalculationOptions,
  readSavedRestoreState,
  SaveAuthError,
  saveIntegralCalculation,
  shouldPersistToProfile,
  shouldRunRestoreSession,
} from "~/lib/saved-calculations";
import { KatexMixedDescription } from "~/components/katex-mixed-description";

type Category = "numpad" | "basic" | "trig" | "calculus" | "vars";

type PadButton = {
  label: string;
  insert: string;
  offset: number;
};

type IntegrationStep = {
  step_number: number;
  rule: string;
  description: string;
  before: string;
  after: string;
};

type IntegralResult = {
  expression: string;
  total_steps: number;
  steps: IntegrationStep[];
  final_answer: string;
};

type GraphPoint = { x: number; y: number | null; dy: number | null };

const PAD: Record<Category, PadButton[]> = {
  numpad: [
    { label: "7", insert: "7", offset: 1 },
    { label: "8", insert: "8", offset: 1 },
    { label: "9", insert: "9", offset: 1 },
    { label: "\\div", insert: "/", offset: 1 },
    { label: "4", insert: "4", offset: 1 },
    { label: "5", insert: "5", offset: 1 },
    { label: "6", insert: "6", offset: 1 },
    { label: "\\times", insert: "*", offset: 1 },
    { label: "1", insert: "1", offset: 1 },
    { label: "2", insert: "2", offset: 1 },
    { label: "3", insert: "3", offset: 1 },
    { label: "-", insert: "-", offset: 1 },
    { label: "0", insert: "0", offset: 1 },
    { label: ".", insert: ".", offset: 1 },
    { label: "()", insert: "()", offset: 1 },
    { label: "+", insert: "+", offset: 1 },
  ],
  basic: [
    { label: "\\sqrt{\\square}", insert: "sqrt()", offset: 5 },
    { label: "\\sqrt[3]{\\square}", insert: "**(1/3)", offset: 0 },
    { label: "\\square^{2}", insert: "**2", offset: 3 },
    { label: "\\square^{n}", insert: "**", offset: 2 },
    { label: "\\frac{\\square}{\\square}", insert: "()/( )", offset: 1 },
    { label: "\\log_{n}(\\square)", insert: "log(, n)", offset: 4 },
    { label: "\\ln(\\square)", insert: "log()", offset: 4 },
    { label: "|\\square|", insert: "Abs()", offset: 4 },
    { label: "e^{\\square}", insert: "exp()", offset: 4 },
    { label: "\\pi", insert: "pi", offset: 2 },
    { label: "e", insert: "E", offset: 1 },
    { label: "\\infty", insert: "oo", offset: 2 },
  ],
  trig: [
    { label: "\\sin(\\square)", insert: "sin()", offset: 4 },
    { label: "\\cos(\\square)", insert: "cos()", offset: 4 },
    { label: "\\tan(\\square)", insert: "tan()", offset: 4 },
    { label: "\\cot(\\square)", insert: "cot()", offset: 4 },
    { label: "\\sec(\\square)", insert: "sec()", offset: 4 },
    { label: "\\csc(\\square)", insert: "csc()", offset: 4 },
    { label: "\\arcsin(\\square)", insert: "asin()", offset: 5 },
    { label: "\\arccos(\\square)", insert: "acos()", offset: 5 },
    { label: "\\arctan(\\square)", insert: "atan()", offset: 5 },
    { label: "\\text{arccot}(\\square)", insert: "acot()", offset: 5 },
    { label: "\\text{arcsec}(\\square)", insert: "asec()", offset: 5 },
    { label: "\\text{arccsc}(\\square)", insert: "acsc()", offset: 5 },
  ],
  calculus: [
    { label: "\\frac{d}{dx}[\\square]", insert: "diff(, x)", offset: 5 },
    { label: "\\frac{d^2}{dx^2}[\\square]", insert: "diff(, x, 2)", offset: 5 },
    { label: "\\int\\square\\,dx", insert: "integrate(, x)", offset: 10 },
    { label: "\\int_a^b\\square\\,dx", insert: "integrate(, (x,a,b))", offset: 10 },
    { label: "\\lim_{x\\to 0}\\square", insert: "limit(, x, 0)", offset: 6 },
    { label: "\\lim_{x\\to 0^-}\\square", insert: "limit(, x, 0, '-')", offset: 6 },
    { label: "\\lim_{x\\to 0^+}\\square", insert: "limit(, x, 0, '+')", offset: 6 },
    { label: "\\sum_{x=1}^{n}\\square", insert: "Sum(, (x, 1, n))", offset: 4 },
    { label: "\\prod_{x=1}^{n}\\square", insert: "product(, (x,1,n))", offset: 8 },
    { label: "\\frac{\\partial}{\\partial x}[\\square]", insert: "diff(, x)", offset: 5 },
    { label: "\\nabla", insert: "gradient", offset: 8 },
    { label: "\\Delta\\square", insert: "laplacian()", offset: 10 },
  ],
  vars: [
    { label: "x", insert: "x", offset: 1 },
    { label: "y", insert: "y", offset: 1 },
    { label: "z", insert: "z", offset: 1 },
    { label: "t", insert: "t", offset: 1 },
    { label: "n", insert: "n", offset: 1 },
    { label: "a", insert: "a", offset: 1 },
    { label: "b", insert: "b", offset: 1 },
    { label: "c", insert: "c", offset: 1 },
    { label: "\\alpha", insert: "alpha", offset: 5 },
    { label: "\\beta", insert: "beta", offset: 4 },
    { label: "\\theta", insert: "theta", offset: 5 },
    { label: "\\lambda", insert: "lambda_", offset: 7 },
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  numpad: "123",
  basic: "Basic",
  trig: "Trig",
  calculus: "Calculus",
  vars: "xyz",
};

function matchParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function wrapBraces(s: string, funcName: string, latexCmd: string): string {
  const token = `${funcName}(`;
  let result = s;
  let pos = 0;
  while (true) {
    const idx = result.indexOf(token, pos);
    if (idx === -1) break;
    const open = idx + funcName.length;
    const close = matchParen(result, open);
    if (close === -1) break;
    const inner = result.slice(open + 1, close);
    const repl = `${latexCmd}{${inner}}`;
    result = result.slice(0, idx) + repl + result.slice(close + 1);
    pos = idx + repl.length;
  }
  return result;
}

function convertLog(s: string): string {
  const token = "log(";
  let result = s;
  let pos = 0;
  while (true) {
    const idx = result.indexOf(token, pos);
    if (idx === -1) break;
    const open = idx + 3;
    const close = matchParen(result, open);
    if (close === -1) break;
    const inside = result.slice(open + 1, close);
    let comma = -1;
    let depth = 0;
    for (let i = 0; i < inside.length; i++) {
      if (inside[i] === "(") depth++;
      else if (inside[i] === ")") depth--;
      else if (inside[i] === "," && depth === 0) {
        comma = i;
        break;
      }
    }
    const repl =
      comma !== -1
        ? `\\log_{${inside.slice(comma + 1).trim()}}\\!\\left(${inside
            .slice(0, comma)
            .trim()}\\right)`
        : `\\ln\\!\\left(${inside}\\right)`;
    result = result.slice(0, idx) + repl + result.slice(close + 1);
    pos = idx + repl.length;
  }
  return result;
}

function pythonToLatex(py: string): string {
  if (!py.trim()) return "\\square";
  let s = py;
  s = wrapBraces(s, "sqrt", "\\sqrt");
  s = s.replace(/\*\*\(1\/3\)/g, "^{\\frac{1}{3}}");
  s = convertLog(s);
  s = wrapBraces(s, "exp", "e^");
  s = s.replace(/\bAbs\(([^)]+)\)/g, "\\left|$1\\right|");
  s = s.replace(/\bdiff\(([^,)]+),\s*x,\s*2\)/g, "\\frac{d^2}{dx^2}\\!\\left[$1\\right]");
  s = s.replace(/\bdiff\(([^,)]+),\s*x\)/g, "\\frac{d}{dx}\\!\\left[$1\\right]");
  s = s.replace(/\bintegrate\(([^,)]+),\s*x\)/g, "\\int $1\\,dx");
  s = s.replace(/\blimit\(([^,)]+),\s*x,\s*0,\s*['"]-['"]\)/g, "\\lim_{x\\to 0^-}$1");
  s = s.replace(/\blimit\(([^,)]+),\s*x,\s*0,\s*['"][+]['"]\)/g, "\\lim_{x\\to 0^+}$1");
  s = s.replace(/\blimit\(([^,)]+),\s*x,\s*0\)/g, "\\lim_{x\\to 0}$1");
  const invTrig: [string, string][] = [
    ["asin", "\\arcsin"],
    ["acos", "\\arccos"],
    ["atan", "\\arctan"],
    ["acot", "\\operatorname{arccot}"],
    ["asec", "\\operatorname{arcsec}"],
    ["acsc", "\\operatorname{arccsc}"],
  ];
  for (const [p, l] of invTrig) s = s.replace(new RegExp(`\\b${p}\\b`, "g"), l);
  const trig: [string, string][] = [
    ["sin", "\\sin"],
    ["cos", "\\cos"],
    ["tan", "\\tan"],
    ["cot", "\\cot"],
    ["sec", "\\sec"],
    ["csc", "\\csc"],
  ];
  for (const [p, l] of trig) s = s.replace(new RegExp(`\\b${p}\\b`, "g"), l);
  s = s.replace(/([A-Za-z_]\w*|\d+)\*\*(\d+)/g, "$1^{$2}");
  s = s.replace(/([A-Za-z_]\w*|\d+)\*\*([A-Za-z_]\w*)/g, "$1^{$2}");
  s = s.replace(/\bpi\b/g, "\\pi");
  s = s.replace(/\boo\b/g, "\\infty");
  s = s.replace(/\bE\b/g, "e");
  s = s.replace(/(?<!\*)\*(?!\*)/g, "\\cdot ");
  return s;
}

function renderLatexInline(tex: string): string {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: false });
  } catch {
    return tex;
  }
}

function computeYDomain(points: GraphPoint[]): [number, number] {
  const ys = points
    .flatMap((p) => [p.y, p.dy])
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  if (!ys.length) return [-10, 10];

  const lo = ys[Math.max(0, Math.floor(ys.length * 0.02))];
  const hi = ys[Math.min(ys.length - 1, Math.ceil(ys.length * 0.98) - 1)];
  const range = Math.max(Math.abs(hi - lo), 1);
  const pad = range * 0.15;
  const rawMin = Math.floor(lo - pad);
  const rawMax = Math.ceil(hi + pad);
  const domainMin = Math.min(rawMin, -Math.ceil(range * 0.15 + 1));
  const domainMax = Math.max(rawMax, Math.ceil(range * 0.15 + 1));

  return [domainMin, domainMax];
}

function getRuleLabel(rule: string): string {
  const labels: Record<string, string> = {
    exp_rule: "Правило экспоненты",
    trig_rule: "Тригонометрическое правило",
    power_rule: "Степенное правило",
    constant_rule: "Интеграл константы",
    constant_times_rule: "Вынос константы",
    sum_rule: "Разбиение суммы",
    u_substitution: "Подстановка",
    parts_rule: "Интегрирование по частям",
    rewrite_rule: "Переписывание выражения",
    expand_rule: "Раскрытие скобок",
    special_function: "Без пошагового разбора",
  };

  return labels[rule] ?? rule.replaceAll("_", " ");
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Интегралы | СПРТ" },
    { name: "description", content: "Калькулятор интегралов с графиком." },
  ];
}

const GRAPH_MIN = -50;
const GRAPH_MAX = 50;
const GRAPH_PTS = 500;
const CHART_WIDTH = 2400;

export default function IntegralPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expr, setExpr] = useState("");
  const [activeTab, setActiveTab] = useState<Category>("basic");
  const [integralResult, setIntegralResult] = useState<IntegralResult | null>(null);
  const [graphPoints, setGraphPoints] = useState<GraphPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const graphScrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const restoredContext = useRef<{ index: number; baseline: string } | null>(null);
  const [isRestoredDirty, setIsRestoredDirty] = useState(false);

  useEffect(() => {
    if (!previewRef.current) return;
    try {
      katex.render(pythonToLatex(expr), previewRef.current, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      if (previewRef.current) previewRef.current.textContent = expr || "□";
    }
  }, [expr]);

  useEffect(() => {
    const el = graphScrollRef.current;
    if (!el || !graphPoints.length) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
  }, [graphPoints]);

  const insertAtCursor = useCallback(
    (text: string, offset: number) => {
      const el = inputRef.current;
      if (!el) {
        setExpr((prev) => prev + text);
        return;
      }
      const start = el.selectionStart ?? expr.length;
      const end = el.selectionEnd ?? expr.length;
      const next = expr.slice(0, start) + text + expr.slice(end);
      setExpr(next);
      const cur = start + offset;
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(cur, cur);
      }, 0);
    },
    [expr],
  );

  const handleBackspace = useCallback(() => {
    const el = inputRef.current;
    if (!el) {
      setExpr((prev) => prev.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? expr.length;
    const end = el.selectionEnd ?? expr.length;
    let next: string;
    if (start !== end) {
      next = expr.slice(0, start) + expr.slice(end);
    } else if (start > 0) {
      next = expr.slice(0, start - 1) + expr.slice(start);
    } else {
      return;
    }
    setExpr(next);
    const cur = start === end ? start - 1 : start;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(cur, cur);
    }, 0);
  }, [expr]);

  useEffect(() => {
    const ctx = restoredContext.current;
    if (!ctx) {
      setIsRestoredDirty(false);
      return;
    }
    setIsRestoredDirty(expr.trim() !== ctx.baseline);
  }, [expr]);

  const runCalculation = useCallback(async (exprValue: string, options?: PersistCalculationOptions): Promise<boolean> => {
    const trimmed = exprValue.trim();
    if (!trimmed) return false;
    const viewingSaved = options?.persistToProfile === false;
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    if (!viewingSaved) {
      setIntegralResult(null);
    }
    setGraphPoints([]);
    const persist = shouldPersistToProfile(isAuthenticatedLocally(), options);
    try {
      if (viewingSaved) {
        const graphResponse = await fetch(
          `${API_BASE_URL}/calculate/evaluate-integrate?expr=${encodeURIComponent(trimmed)}&x_min=${GRAPH_MIN}&x_max=${GRAPH_MAX}&n_points=${GRAPH_PTS}&var=x`,
        );
        let graphPayload: unknown = null;
        try {
          graphPayload = await graphResponse.json();
        } catch {
          graphPayload = null;
        }
        if (!graphResponse.ok) {
          throw new Error(getFastApiErrorDetail(graphPayload) || "Ошибка построения графика.");
        }
        setGraphPoints((graphPayload as { points: GraphPoint[] }).points);
        return true;
      }

      const [integralResponse, graphResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/calculate/integrate-steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: getCalculationCredentials(persist),
          body: JSON.stringify({ expr: trimmed, var: "x" }),
        }),
        fetch(
          `${API_BASE_URL}/calculate/evaluate-integrate?expr=${encodeURIComponent(trimmed)}&x_min=${GRAPH_MIN}&x_max=${GRAPH_MAX}&n_points=${GRAPH_PTS}&var=x`,
        ),
      ]);

      let integralPayload: unknown = null;
      let graphPayload: unknown = null;
      try {
        integralPayload = await integralResponse.json();
      } catch {
        integralPayload = null;
      }
      try {
        graphPayload = await graphResponse.json();
      } catch {
        graphPayload = null;
      }

      if (!integralResponse.ok) {
        throw new Error(getFastApiErrorDetail(integralPayload) || "Ошибка вычисления интеграла.");
      }
      if (!graphResponse.ok) {
        throw new Error(getFastApiErrorDetail(graphPayload) || "Ошибка построения графика.");
      }

      setIntegralResult(integralPayload as IntegralResult);
      setGraphPoints((graphPayload as { points: GraphPoint[] }).points);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const persistAfterChange = async (trimmed: string) => {
    const ctx = restoredContext.current;
    if (!ctx || trimmed === ctx.baseline) return;
    await saveIntegralCalculation(trimmed, { replaceIndex: ctx.index });
    restoredContext.current = { index: ctx.index, baseline: trimmed };
    setIsRestoredDirty(false);
    setSaveMessage("Изменения сохранены в профиле.");
  };

  const handleCalculate = async () => {
    const trimmed = expr.trim();
    if (!trimmed) return;
    const ctx = restoredContext.current;
    const dirty = Boolean(ctx && trimmed !== ctx.baseline);

    if (dirty && isAuthenticatedLocally()) {
      const ok = await runCalculation(trimmed, { persistToProfile: false });
      if (!ok) return;
      try {
        await persistAfterChange(trimmed);
      } catch (e) {
        if (e instanceof SaveAuthError) {
          navigate(getLoginRedirectUrl(location.pathname));
          return;
        }
        setError(e instanceof Error ? e.message : "Не удалось сохранить изменения.");
      }
      return;
    }

    void runCalculation(trimmed, { persistToProfile: true });
  };

  useEffect(() => {
    const restore = readSavedRestoreState(location.state);
    if (!restore || restore.entry.type !== "integrate-steps" || restoredRef.current) return;

    const sessionKey = getRestoreSessionKey(restore.entry, restore.index);
    if (!shouldRunRestoreSession(sessionKey)) return;

    restoredRef.current = true;
    const inputExpr = typeof restore.entry.start_date === "string" ? restore.entry.start_date : "";
    if (!inputExpr) return;

    restoredContext.current = { index: restore.index, baseline: inputExpr.trim() };
    setExpr(inputExpr);
    if (typeof restore.entry.result === "string" && restore.entry.result) {
      setIntegralResult({
        expression: inputExpr,
        total_steps: 0,
        steps: [],
        final_answer: restore.entry.result,
      });
    }

    navigate(location.pathname, { replace: true, state: null });
    void runCalculation(inputExpr, { persistToProfile: false });
  }, [location.pathname, location.state, navigate, runCalculation]);

  const handleSave = async () => {
    if (!expr.trim()) return;
    if (!isAuthenticatedLocally()) {
      navigate(getLoginRedirectUrl(location.pathname));
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const trimmed = expr.trim();
      const ctx = restoredContext.current;
      const replaceIndex = ctx && trimmed !== ctx.baseline ? ctx.index : undefined;
      await saveIntegralCalculation(trimmed, { replaceIndex });
      if (ctx) {
        restoredContext.current = { index: ctx.index, baseline: trimmed };
        setIsRestoredDirty(false);
      }
      setSaveMessage(
        replaceIndex !== undefined ? "Изменения сохранены в профиле." : "Расчёт сохранён в профиле.",
      );
    } catch (e) {
      if (e instanceof SaveAuthError) {
        navigate(getLoginRedirectUrl(location.pathname));
        return;
      }
      setError(e instanceof Error ? e.message : "Не удалось сохранить расчёт.");
    } finally {
      setSaving(false);
    }
  };

  const [yMin, yMax] = computeYDomain(graphPoints);

  return (
    <div className="container-xl mt-4 mb-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="/">Главная</a>
          </li>
          <li className="breadcrumb-item">Калькуляторы</li>
          <li className="breadcrumb-item active" aria-current="page">
            Интегралы
          </li>
        </ol>
      </nav>

      <h1 className="fw-bold mb-1 mt-4">Интегралы</h1>
      <p className="text-secondary mb-4">
        Постройте подынтегральную функцию с помощью клавиатуры и нажмите <em>Вычислить</em>.
      </p>

      <div className="row g-4 pb-5">
        <div className="col-12 col-xl-7">
          <div
            className="card border rounded-3 mb-2 px-4 py-3 bg-white overflow-auto text-center"
            style={{ minHeight: 76 }}
          >
            <div ref={previewRef} />
          </div>

          <textarea
            ref={inputRef}
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                void handleCalculate();
                return;
              }
              if (e.key === "Backspace") {
                e.preventDefault();
                handleBackspace();
              }
            }}
            className="form-control font-monospace mb-2"
            rows={2}
            placeholder="f(x) — введите подынтегральную функцию или используйте клавиатуру…"
            spellCheck={false}
            style={{ resize: "none" }}
          />
          <p className="small text-secondary mb-2">Подсказка: отправка по Shift + Enter.</p>

          <ul className="nav nav-pills gap-1 mb-2 flex-wrap">
            {(Object.keys(PAD) as Category[]).map((cat) => (
              <li className="nav-item" key={cat}>
                <button
                  className={`nav-link py-1 px-3 ${activeTab === cat ? "active" : ""}`}
                  style={{ fontSize: "0.82rem" }}
                  onClick={() => setActiveTab(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              </li>
            ))}
          </ul>

          <div className="d-grid gap-1 mb-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {PAD[activeTab].map((btn, i) => (
              <button
                key={i}
                className="btn btn-outline-secondary py-2"
                style={{ fontSize: "0.82rem", minHeight: 48 }}
                onClick={() => insertAtCursor(btn.insert, btn.offset)}
                dangerouslySetInnerHTML={{ __html: renderLatexInline(btn.label) }}
              />
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <button
                className="btn btn-dark px-4"
                onClick={() => void handleCalculate()}
                disabled={loading || !expr.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Вычисляется…
                  </>
                ) : (
                  "Вычислить ∫f(x)dx"
                )}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  setExpr("");
                  setIntegralResult(null);
                  setGraphPoints([]);
                  setError(null);
                }}
              >
                Очистить
              </button>
              <button className="btn btn-outline-secondary" onClick={handleBackspace}>
                <i className="bi bi-backspace"></i>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={saving || loading || !expr.trim()}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Сохранение…
                </>
              ) : (
                "Сохранить"
              )}
            </button>
          </div>

          {saveMessage && <div className="alert alert-success py-2 mt-3 mb-0">{saveMessage}</div>}
          {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}

          {integralResult && integralResult.steps.length > 0 && (
            <div className="card border rounded-3 p-3 mt-3">
              <h3 className="h6 fw-medium text-secondary mb-3">Шаги решения</h3>
              <div className="d-flex flex-column gap-3">
                {integralResult.steps.map((step) => (
                  <div key={`${step.step_number}-${step.rule}`} className="border rounded-3 p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <span className="badge text-bg-dark">Шаг {step.step_number}</span>
                      <span className="small text-secondary">{getRuleLabel(step.rule)}</span>
                    </div>
                    <p className="small mb-2">
                      <KatexMixedDescription text={step.description} />
                    </p>
                    <div className="small text-secondary mb-1">До</div>
                    <KatexBlock latex={step.before} />
                    <div className="small text-secondary mt-2 mb-1">После</div>
                    <KatexBlock latex={step.after} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-12 col-xl-5">
          {integralResult && (
            <div className="card border rounded-3 p-4 mb-3">
              <p className="text-secondary small mb-2 fw-medium">∫f(x)dx =</p>
              <KatexBlock latex={integralResult.final_answer} />
              <hr className="my-2" />
              <code className="text-secondary small">
                Шагов решения: {integralResult.total_steps}
              </code>
            </div>
          )}

          {graphPoints.length > 0 && (
            <div className="card border rounded-3 p-3">
              <p className="fw-medium small text-secondary mb-2">График f(x) и F(x)</p>
              <div
                ref={graphScrollRef}
                style={{ overflowX: "scroll", overflowY: "hidden" }}
                className="pb-3"
              >
                <LineChart
                  width={CHART_WIDTH}
                  height={300}
                  data={graphPoints}
                  margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v: number) => v.toFixed(0)}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    tick={{ fontSize: 11 }}
                    width={42}
                    allowDataOverflow
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine x={0} stroke="#374151" strokeWidth={1.5} />
                  <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      typeof val === "number" ? val.toFixed(4) : "—",
                      name === "y" ? "f(x)" : "F(x)",
                    ]}
                    labelFormatter={(label: unknown) => `x = ${Number(label).toFixed(3)}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value: string) => (value === "y" ? "f(x)" : "F(x)")}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#2563eb"
                    dot={false}
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="dy"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={2}
                    connectNulls={false}
                    strokeDasharray="5 3"
                    isAnimationActive={false}
                  />
                </LineChart>
              </div>
            </div>
          )}

          {!integralResult && !graphPoints.length && !loading && (
            <div className="card border rounded-3 p-5 text-center text-secondary">
              <i className="bx bx-math fs-1 d-block mb-2" />
              <p className="mb-0">Введите подынтегральную функцию и нажмите Вычислить</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KatexBlock({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, { throwOnError: false, displayMode: true });
    } catch {
      if (ref.current) ref.current.textContent = latex;
    }
  }, [latex]);

  return <div ref={ref} className="overflow-auto" />;
}
