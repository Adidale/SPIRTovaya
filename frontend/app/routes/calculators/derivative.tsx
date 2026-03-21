import { useState, useRef, useEffect, useCallback } from "react";
import type { Route } from "./+types/derivative";
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
import { API_BASE_URL } from "~/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "numpad" | "basic" | "trig" | "calculus" | "vars";

type PadButton = {
  label: string;
  insert: string;
  offset: number;
};

type DerivResult = { plain_text: string; latex: string };
type GraphPoint  = { x: number; y: number | null; dy: number | null };

// ─── Pad config ───────────────────────────────────────────────────────────────

const PAD: Record<Category, PadButton[]> = {
  numpad: [
    { label: "7",       insert: "7",  offset: 1 },
    { label: "8",       insert: "8",  offset: 1 },
    { label: "9",       insert: "9",  offset: 1 },
    { label: "\\div",   insert: "/",  offset: 1 },
    { label: "4",       insert: "4",  offset: 1 },
    { label: "5",       insert: "5",  offset: 1 },
    { label: "6",       insert: "6",  offset: 1 },
    { label: "\\times", insert: "*",  offset: 1 },
    { label: "1",       insert: "1",  offset: 1 },
    { label: "2",       insert: "2",  offset: 1 },
    { label: "3",       insert: "3",  offset: 1 },
    { label: "-",       insert: "-",  offset: 1 },
    { label: "0",       insert: "0",  offset: 1 },
    { label: ".",       insert: ".",  offset: 1 },
    { label: "()",      insert: "()", offset: 1 },
    { label: "+",       insert: "+",  offset: 1 },
  ],
  basic: [
    { label: "\\sqrt{\\square}",            insert: "sqrt()",    offset: 5 },
    { label: "\\sqrt[3]{\\square}",         insert: "**(1/3)",   offset: 0 },
    { label: "\\square^{2}",               insert: "**2",        offset: 3 },
    { label: "\\square^{n}",               insert: "**",         offset: 2 },
    { label: "\\frac{\\square}{\\square}", insert: "()/( )",     offset: 1 },
    { label: "\\log_{n}(\\square)",        insert: "log(, n)",   offset: 4 },
    { label: "\\ln(\\square)",             insert: "log()",      offset: 4 },
    { label: "|\\square|",                 insert: "Abs()",      offset: 4 },
    { label: "e^{\\square}",              insert: "exp()",       offset: 4 },
    { label: "\\pi",                       insert: "pi",         offset: 2 },
    { label: "e",                          insert: "E",          offset: 1 },
    { label: "\\infty",                    insert: "oo",         offset: 2 },
  ],
  trig: [
    { label: "\\sin(\\square)",          insert: "sin()",  offset: 4 },
    { label: "\\cos(\\square)",          insert: "cos()",  offset: 4 },
    { label: "\\tan(\\square)",          insert: "tan()",  offset: 4 },
    { label: "\\cot(\\square)",          insert: "cot()",  offset: 4 },
    { label: "\\sec(\\square)",          insert: "sec()",  offset: 4 },
    { label: "\\csc(\\square)",          insert: "csc()",  offset: 4 },
    { label: "\\arcsin(\\square)",       insert: "asin()", offset: 5 },
    { label: "\\arccos(\\square)",       insert: "acos()", offset: 5 },
    { label: "\\arctan(\\square)",       insert: "atan()", offset: 5 },
    { label: "\\text{arccot}(\\square)", insert: "acot()", offset: 5 },
    { label: "\\text{arcsec}(\\square)", insert: "asec()", offset: 5 },
    { label: "\\text{arccsc}(\\square)", insert: "acsc()", offset: 5 },
  ],
  calculus: [
    { label: "\\frac{d}{dx}[\\square]",      insert: "diff(, x)",            offset: 5  },
    { label: "\\frac{d^2}{dx^2}[\\square]",  insert: "diff(, x, 2)",         offset: 5  },
    { label: "\\int\\square\\,dx",           insert: "integrate(, x)",       offset: 10 },
    { label: "\\int_a^b\\square\\,dx",       insert: "integrate(, (x,a,b))", offset: 10 },
    { label: "\\lim_{x\\to 0}\\square",      insert: "limit(, x, 0)",        offset: 6  },
    { label: "\\lim_{x\\to 0^-}\\square",   insert: "limit(, x, 0, '-')",   offset: 6  },
    { label: "\\lim_{x\\to 0^+}\\square",   insert: "limit(, x, 0, '+')",   offset: 6  },
    { label: "\\sum_{x=1}^{n}\\square",      insert: "Sum(, (x, 1, n))",     offset: 4  },
    { label: "\\prod_{x=1}^{n}\\square",     insert: "product(, (x,1,n))",   offset: 8  },
    { label: "\\frac{\\partial}{\\partial x}[\\square]", insert: "diff(, x)", offset: 5 },
    { label: "\\nabla",                      insert: "gradient",             offset: 8  },
    { label: "\\Delta\\square",              insert: "laplacian()",          offset: 10 },
  ],
  vars: [
    { label: "x",        insert: "x",        offset: 1 },
    { label: "y",        insert: "y",        offset: 1 },
    { label: "z",        insert: "z",        offset: 1 },
    { label: "t",        insert: "t",        offset: 1 },
    { label: "n",        insert: "n",        offset: 1 },
    { label: "a",        insert: "a",        offset: 1 },
    { label: "b",        insert: "b",        offset: 1 },
    { label: "c",        insert: "c",        offset: 1 },
    { label: "\\alpha",  insert: "alpha",    offset: 5 },
    { label: "\\beta",   insert: "beta",     offset: 4 },
    { label: "\\theta",  insert: "theta",    offset: 5 },
    { label: "\\lambda", insert: "lambda_",  offset: 7 },
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  numpad:   "123",
  basic:    "Basic",
  trig:     "Trig",
  calculus: "Calculus",
  vars:     "xyz",
};

// ─── LaTeX helpers ────────────────────────────────────────────────────────────

function matchParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function wrapBraces(s: string, funcName: string, latexCmd: string): string {
  const token = funcName + "(";
  let result = s, pos = 0;
  while (true) {
    const idx = result.indexOf(token, pos);
    if (idx === -1) break;
    const open  = idx + funcName.length;
    const close = matchParen(result, open);
    if (close === -1) break;
    const inner = result.slice(open + 1, close);
    const repl  = `${latexCmd}{${inner}}`;
    result = result.slice(0, idx) + repl + result.slice(close + 1);
    pos = idx + repl.length;
  }
  return result;
}

function convertLog(s: string): string {
  const token = "log(";
  let result = s, pos = 0;
  while (true) {
    const idx = result.indexOf(token, pos);
    if (idx === -1) break;
    const open  = idx + 3;
    const close = matchParen(result, open);
    if (close === -1) break;
    const inside = result.slice(open + 1, close);
    let comma = -1, depth = 0;
    for (let i = 0; i < inside.length; i++) {
      if (inside[i] === "(") depth++;
      else if (inside[i] === ")") depth--;
      else if (inside[i] === "," && depth === 0) { comma = i; break; }
    }
    const repl = comma !== -1
      ? `\\log_{${inside.slice(comma + 1).trim()}}\\!\\left(${inside.slice(0, comma).trim()}\\right)`
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
    ["asin","\\arcsin"], ["acos","\\arccos"], ["atan","\\arctan"],
    ["acot","\\operatorname{arccot}"], ["asec","\\operatorname{arcsec}"],
    ["acsc","\\operatorname{arccsc}"],
  ];
  for (const [p, l] of invTrig) s = s.replace(new RegExp(`\\b${p}\\b`, "g"), l);
  const trig: [string, string][] = [
    ["sin","\\sin"], ["cos","\\cos"], ["tan","\\tan"],
    ["cot","\\cot"], ["sec","\\sec"], ["csc","\\csc"],
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

// ─── Graph helpers ────────────────────────────────────────────────────────────

/**
 * Compute a display Y domain using the 2nd–98th percentile of the data,
 * so singularities are visible (values fly off the edge) but don't crush
 * the rest of the curve.
 */
function computeYDomain(points: GraphPoint[]): [number, number] {
  const ys = points
    .flatMap((p) => [p.y, p.dy])
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  if (!ys.length) return [-10, 10];

  const lo    = ys[Math.max(0, Math.floor(ys.length * 0.02))];
  const hi    = ys[Math.min(ys.length - 1, Math.ceil(ys.length * 0.98) - 1)];
  const range = Math.max(Math.abs(hi - lo), 1);
  const pad   = range * 0.15;

  // Always show both quadrants — ensure the domain spans across y = 0
  const rawMin = Math.floor(lo - pad);
  const rawMax = Math.ceil(hi + pad);
  const domainMin = Math.min(rawMin, -Math.ceil(range * 0.15 + 1));
  const domainMax = Math.max(rawMax,  Math.ceil(range * 0.15 + 1));

  return [domainMin, domainMax];
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Derivatives | SPRT" },
    { name: "description", content: "Derivative calculator with graph." },
  ];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAPH_MIN   = -50;
const GRAPH_MAX   =  50;
const GRAPH_PTS   = 500;
const CHART_WIDTH = 2400;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DerivativePage() {
  const [expr, setExpr]               = useState("");
  const [activeTab, setActiveTab]     = useState<Category>("basic");
  const [derivResult, setDerivResult] = useState<DerivResult | null>(null);
  const [graphPoints, setGraphPoints] = useState<GraphPoint[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const previewRef     = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const graphScrollRef = useRef<HTMLDivElement>(null);

  // Live KaTeX preview
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

  // Auto-scroll graph to center (x = 0) when data loads
  useEffect(() => {
    const el = graphScrollRef.current;
    if (!el || !graphPoints.length) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
  }, [graphPoints]);

  // Insert text at textarea cursor
  const insertAtCursor = useCallback(
    (text: string, offset: number) => {
      const el = inputRef.current;
      if (!el) { setExpr((p) => p + text); return; }
      const start = el.selectionStart ?? expr.length;
      const end   = el.selectionEnd   ?? expr.length;
      const next  = expr.slice(0, start) + text + expr.slice(end);
      setExpr(next);
      const cur = start + offset;
      setTimeout(() => { el.focus(); el.setSelectionRange(cur, cur); }, 0);
    },
    [expr],
  );

  const handleBackspace = useCallback(() => {
    const el = inputRef.current;
    if (!el) { setExpr((p) => p.slice(0, -1)); return; }
    const start = el.selectionStart ?? expr.length;
    const end   = el.selectionEnd   ?? expr.length;
    let next: string;
    if (start !== end) {
      next = expr.slice(0, start) + expr.slice(end);
    } else if (start > 0) {
      next = expr.slice(0, start - 1) + expr.slice(start);
    } else return;
    setExpr(next);
    const cur = start === end ? start - 1 : start;
    setTimeout(() => { el.focus(); el.setSelectionRange(cur, cur); }, 0);
  }, [expr]);

  const handleCalculate = async () => {
    if (!expr.trim()) return;
    setLoading(true);
    setError(null);
    setDerivResult(null);
    setGraphPoints([]);
    try {
      const [dRes, eRes] = await Promise.all([
        fetch(`${API_BASE_URL}/calculate/derivative?expr=${encodeURIComponent(expr)}&var=x`),
        fetch(`${API_BASE_URL}/calculate/evaluate?expr=${encodeURIComponent(expr)}&x_min=${GRAPH_MIN}&x_max=${GRAPH_MAX}&n_points=${GRAPH_PTS}&var=x`),
      ]);
      if (!dRes.ok) throw new Error(((await dRes.json()) as { detail?: string }).detail ?? "Derivative error.");
      if (!eRes.ok) throw new Error(((await eRes.json()) as { detail?: string }).detail ?? "Evaluation error.");
      setDerivResult((await dRes.json()) as DerivResult);
      setGraphPoints(((await eRes.json()) as { points: GraphPoint[] }).points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  };

  const [yMin, yMax] = computeYDomain(graphPoints);

  return (
    <div className="container-xl mt-4 mb-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/">Главная</a></li>
          <li className="breadcrumb-item">Калькуляторы</li>
          <li className="breadcrumb-item active" aria-current="page">Производные</li>
        </ol>
      </nav>

      <h1 className="fw-bold mb-1 mt-4">Производные</h1>
      <p className="text-secondary mb-4">
        Постройте функцию с помощью клавиатуры и нажмите <em>Вычислить</em>.
      </p>

      <div className="row g-4 pb-5">
        {/* ── Left: Editor + Pad ───────────────────────────────────────── */}
        <div className="col-12 col-xl-7">

          {/* KaTeX preview */}
          <div
            className="card border rounded-3 mb-2 px-4 py-3 bg-white overflow-auto text-center"
            style={{ minHeight: 76 }}
          >
            <div ref={previewRef} />
          </div>

          {/* Editable expression field */}
          <textarea
            ref={inputRef}
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); }
            }}
            className="form-control font-monospace mb-2"
            rows={2}
            placeholder="f(x) — введите функцию или используйте клавиатуру…"
            spellCheck={false}
            style={{ resize: "none" }}
          />

          {/* Category tabs */}
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

          {/* Pad — always 4 columns */}
          <div
            className="d-grid gap-1 mb-3"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
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

          {/* Actions */}
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <button
              className="btn btn-dark px-4"
              onClick={handleCalculate}
              disabled={loading || !expr.trim()}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Вычисляется…</>
                : "Вычислить f′(x)"}
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={() => { setExpr(""); setDerivResult(null); setGraphPoints([]); setError(null); }}
            >
              Очистить
            </button>
            <button className="btn btn-outline-secondary" onClick={handleBackspace}>
              <i className="bi bi-backspace"></i>
            </button>
          </div>

          {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
        </div>

        {/* ── Right: Result + Graph ────────────────────────────────────── */}
        <div className="col-12 col-xl-5">

          {derivResult && (
            <div className="card border rounded-3 p-4 mb-3">
              <p className="text-secondary small mb-2 fw-medium">f'(x) =</p>
              <KatexBlock latex={derivResult.latex} />
              <hr className="my-2" />
              <code className="text-secondary small">{derivResult.plain_text}</code>
            </div>
          )}

          {graphPoints.length > 0 && (
            <div className="card border rounded-3 p-3">
              <p className="fw-medium small text-secondary mb-2">
                График — прокрутите для навигации. Значения вне диапазона указывают на сингулярности
              </p>
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
                  {/* Mathematical axes at x=0 and y=0 */}
                  <ReferenceLine x={0} stroke="#374151" strokeWidth={1.5} />
                  <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      typeof val === "number" ? val.toFixed(4) : "—",
                      name === "y" ? "f(x)" : "f′(x)",
                    ]}
                    labelFormatter={(label: unknown) => `x = ${Number(label).toFixed(3)}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    formatter={(val: string) => (val === "y" ? "f(x)" : "f′(x)")}
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

          {!derivResult && !graphPoints.length && !loading && (
            <div className="card border rounded-3 p-5 text-center text-secondary">
              <i className="bx bx-math fs-1 d-block mb-2" />
              <p className="mb-0">Введите функцию и нажмите Вычислить</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KaTeX block sub-component ───────────────────────────────────────────────

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
