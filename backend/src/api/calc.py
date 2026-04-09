import math
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sympy import Add, diff, exp, integrate, Integral, latex, lambdify, log, Mul, sympify, symbols
from sympy import cos, csc, sec, sin, tan
from sympy.integrals.manualintegrate import *
from .schemas import (
    DerivativeRequestSchema,
    DerivativeResponseSchema,
    EvaluateSchema,
    IntegralRequestSchema,
    IntegralResponseSchema,
)


router = APIRouter(prefix="/calculate", tags=['Calculations'])


def integral_latex(integrand, dvar):
    """
    LaTeX for ∫ integrand d(dvar).

    Never pass raw strings through sympy.latex() — it escapes backslashes and breaks
    fragments like \\cdot (shows as \\textbackslashcdot in KaTeX).
    """
    dv = latex(dvar)
    if isinstance(integrand, str):
        inner = integrand.strip()
        if not inner:
            return rf"\int \ldots \, d{dv}"
        return rf"\int {inner} \, d{dv}"
    if integrand is None:
        return rf"\int \ldots \, d{dv}"
    return latex(Integral(integrand, dvar))


'''Все варианты действий интегратора SymPy
['AddRule', 'AlternativeRule', 'ArcsinRule', 'ArcsinhRule', 'ArctanRule', 'AssocLaguerreRule', 'AtomicRule', 'ChebyshevTRule', 'ChebyshevURule', 'ChiRule', 'CiRule', 'CompleteSquareRule',
'ConstantRule', 'ConstantTimesRule', 'CosRule', 'CoshRule', 'Csc2Rule', 'CscCotRule', 'CyclicPartsRule', 'DerivativeRule', 'DiracDeltaRule', 'DontKnowRule', 'EiRule', 'EllipticERule', 'EllipticFRule',
'ErfRule', 'ExpRule', 'FresnelCRule', 'FresnelSRule', 'GegenbauerRule', 'HeavisideRule', 'HermiteRule', 'HyperbolicRule', 'IRule', 'JacobiRule', 'LaguerreRule', 'LegendreRule', 'LiRule', 'NestedPowRule',
'OrthogonalPolyRule', 'PartsRule', 'PiecewiseRule', 'PolylogRule', 'PowerRule', 'ReciprocalRule', 'ReciprocalSqrtQuadraticRule', 'RewriteRule', 'Rule', 'Sec2Rule', 'SecTanRule', 'ShiRule', 'SiRule', 'SinRule',
'SinhRule', 'SqrtQuadraticDenomRule', 'SqrtQuadraticRule', 'TrigRule', 'TrigSubstitutionRule', 'URule', 'UpperGammaRule']'''


def format_steps_json(step, var, start_index=1):
    steps = []
    current_idx = start_index

    raw_expr = getattr(step, 'integrand', getattr(step, 'context', step))
    before_latex = integral_latex(raw_expr, var)
    after_math = getattr(step, 'integral', None)

    if isinstance(step, list):
        if not step: return []
        return format_steps_json(step[0], var, start_index)

    elif isinstance(step, ExpRule):
        after_math = getattr(step, 'integral', exp(var))

        steps.append({
            "step_number": current_idx,
            "rule": "exp_rule",
            "description": "Интеграл от экспоненты равен самой экспоненте",
            "before": before_latex,
            "after": latex(after_math)
        })

    elif isinstance(step, (SinRule, CosRule)):
        after_math = getattr(step, 'integral', None)
        if after_math is None:
            from sympy import sin, cos
            after_math = -cos(var) if isinstance(step, SinRule) else sin(var)

        steps.append({
            "step_number": current_idx,
            "rule": "trig_rule",
            "description": "Интегрирование тригонометрической функции",
            "before": before_latex,
            "after": latex(after_math)
        })

    elif isinstance(step, PowerRule):
        if after_math is None: after_math = (step.base ** (step.exp + 1)) / (step.exp + 1)
        steps.append({
            "step_number": current_idx, "rule": "power_rule",
            "description": "Правило степени",
            "before": before_latex, "after": latex(after_math)
        })

    elif isinstance(step, ConstantRule):
        const = getattr(step, 'constant', 1)
        steps.append({
            "step_number": current_idx, "rule": "constant_rule",
            "description": "Интеграл константы",
            "before": before_latex, "after": latex(const * var)
        })

    elif isinstance(step, ConstantTimesRule):
        const = getattr(step, 'constant', 1)
        sub_ig = getattr(step.substep, 'integrand', None)
        if isinstance(sub_ig, str):
            after_latex = f"{latex(const)} \\cdot {integral_latex(sub_ig, var)}"
        elif sub_ig is None:
            after_latex = f"{latex(const)} \\cdot {integral_latex('', var)}"
        else:
            after_latex = latex(Mul(const, Integral(sub_ig, var)))
        steps.append({
            "step_number": current_idx, "rule": "constant_times_rule",
            "description": f"Вынос константы {latex(const)}",
            "before": before_latex,
            "after": after_latex,
        })
        steps.extend(format_steps_json(step.substep, var, start_index=len(steps) + start_index))

    elif isinstance(step, AddRule):
        substeps = getattr(step, 'substeps', [])
        after_parts = [integral_latex(getattr(s, 'integrand', s), var) for s in substeps]
        steps.append({
            "step_number": current_idx, "rule": "sum_rule",
            "description": "Разбиение суммы",
            "before": before_latex,
            "after": " + ".join(after_parts),
        })
        for substep in substeps:
            steps.extend(format_steps_json(substep, var, start_index=len(steps) + start_index))

    elif isinstance(step, URule):
        u_var = step.u_var
        u_func = step.u_func
        # В 1.14.0 это список, берем первый элемент
        sub_list = getattr(step, 'substeps', [])
        actual_substep = sub_list[0] if sub_list else step

        u_ig = getattr(actual_substep, 'integrand', None)
        u_after = integral_latex("f(u)" if u_ig is None else u_ig, u_var)
        steps.append({
            "step_number": current_idx,
            "rule": "u_substitution",
            "description": f"Замена: $u = {latex(u_func)}$, тогда $du = {latex(u_func.diff(var))} dx$",
            "before": before_latex,
            "after": u_after,
        })

        # Рекурсия: ПЕРЕДАЕМ ОБЪЕКТ ИЗ СПИСКА, А НЕ ВЕСЬ СПИСОК
        for s in sub_list:
            steps.extend(format_steps_json(s, u_var, start_index=len(steps) + start_index))

        # --- ИСПРАВЛЕННЫЙ PartsRule ---

    elif isinstance(step, PartsRule):
        u = step.u
        dv = step.dv
        v_step = step.v_step

        # 1. Извлекаем v. Если v_step — список, берем первый элемент
        target_v_step = v_step if not isinstance(v_step, list) else v_step[0]
        v_val = getattr(target_v_step, 'integral', None)

        # 2. Извлекаем substep для v*du. Это ВСЕГДА список в 1.14.0
        sub_list = getattr(step, 'substeps', [])
        # Берем ПЕРВЫЙ объект из списка, чтобы получить его 'integrand'
        actual_substep = sub_list[0] if (isinstance(sub_list, list) and len(sub_list) > 0) else sub_list

        # 3. Получаем формулу под интегралом (v * du)
        # Здесь мы гарантируем, что берем атрибут у ОБЪЕКТА, а не у СПИСКА
        v_du_expr = getattr(actual_substep, 'integrand', None)
        rhs = integral_latex(r"v \cdot du" if v_du_expr is None else v_du_expr, var)

        steps.append({
            "step_number": current_idx,
            "rule": "parts_rule",
            "description": f"Интегрирование по частям: $u = {latex(u)}$, $dv = {latex(dv)} dx$. "
                           f"Тогда $v = {latex(v_val) if v_val is not None else 'v'}$.",
            "before": before_latex,
            "after": f"{latex(u * v_val if v_val is not None else u)} - {rhs}",
        })

        # 4. Рекурсия (проходим по списку)
        if isinstance(sub_list, list):
            for s in sub_list:
                steps.extend(format_steps_json(s, var, start_index=len(steps) + start_index + 1))

    elif isinstance(step, AlternativeRule):
        # AlternativeRule содержит список стратегий в атрибуте alternatives.
        # Мы выбираем первую (обычно самую оптимальную) и продолжаем рекурсию.
        best_strategy = step.alternatives[0]
        return format_steps_json(best_strategy, var, start_index=current_idx)

    elif isinstance(step, RewriteRule):
        # RewriteRule содержит пояснение (description) и подшаг (substep)
        description = getattr(step, 'description', "Упростим выражение перед интегрированием")
        substep = getattr(step, 'substep', None)

        if substep:
            # Добавляем поясняющий шаг о переписывании
            rw_ig = getattr(substep, 'integrand', None)
            steps.append({
                "step_number": current_idx,
                "rule": "rewrite_rule",
                "description": description,
                "before": before_latex,
                "after": integral_latex(rw_ig, var),
            })
            # Рекурсивно идем вглубь этого правила
            steps.extend(format_steps_json(substep, var, start_index=len(steps) + start_index))

    else:
        print(f"DEBUG: Пропущено правило типа {type(step)}")

    return steps


def derivative_operator_latex(expr, var):
    return f"\\frac{{d}}{{d{latex(var)}}}\\left({latex(expr)}\\right)"


def format_derivative_steps(expr, var, start_index=1):
    steps = []
    current_idx = start_index

    if expr.is_number:
        return [{
            "step_number": current_idx,
            "rule": "constant_rule",
            "description": "Производная константы равна нулю",
            "before": derivative_operator_latex(expr, var),
            "after": latex(0),
        }]

    if expr == var:
        return [{
            "step_number": current_idx,
            "rule": "power_rule",
            "description": "Производная переменной равна единице",
            "before": derivative_operator_latex(expr, var),
            "after": latex(1),
        }]

    coeff, remainder = expr.as_coeff_Mul()
    if coeff != 1 and remainder != 1 and remainder.has(var):
        steps.append({
            "step_number": current_idx,
            "rule": "constant_times_rule",
            "description": f"Выносим константу {latex(coeff)} перед знаком производной",
            "before": derivative_operator_latex(expr, var),
            "after": f"{latex(coeff)} \\cdot {derivative_operator_latex(remainder, var)}",
        })
        steps.extend(format_derivative_steps(remainder, var, current_idx + 1))
        return steps

    if isinstance(expr, Add):
        terms = expr.as_ordered_terms()
        steps.append({
            "step_number": current_idx,
            "rule": "sum_rule",
            "description": "Производная суммы равна сумме производных",
            "before": derivative_operator_latex(expr, var),
            "after": " + ".join(derivative_operator_latex(term, var) for term in terms),
        })
        next_idx = current_idx + 1
        for term in terms:
            term_steps = format_derivative_steps(term, var, next_idx)
            steps.extend(term_steps)
            next_idx += len(term_steps)
        return steps

    if expr.is_Pow and expr.base == var and expr.exp.is_number:
        return [{
            "step_number": current_idx,
            "rule": "power_rule",
            "description": "Применяем степенное правило",
            "before": derivative_operator_latex(expr, var),
            "after": latex(diff(expr, var)),
        }]

    if expr.func == sin and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "trig_rule",
            "description": "Производная sin(x) равна cos(x)",
            "before": derivative_operator_latex(expr, var),
            "after": latex(cos(var)),
        }]

    if expr.func == cos and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "trig_rule",
            "description": "Производная cos(x) равна -sin(x)",
            "before": derivative_operator_latex(expr, var),
            "after": latex(-sin(var)),
        }]

    if expr.func == tan and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "trig_rule",
            "description": "Производная tan(x) равна sec^2(x)",
            "before": derivative_operator_latex(expr, var),
            "after": latex(sec(var) ** 2),
        }]

    if expr.func == sec and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "trig_rule",
            "description": "Производная sec(x) равна sec(x)tan(x)",
            "before": derivative_operator_latex(expr, var),
            "after": latex(sec(var) * tan(var)),
        }]

    if expr.func == csc and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "trig_rule",
            "description": "Производная csc(x) равна -csc(x)cot(x)",
            "before": derivative_operator_latex(expr, var),
            "after": latex(diff(expr, var)),
        }]

    if expr.func == exp and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "exp_rule",
            "description": "Производная экспоненты равна самой экспоненте",
            "before": derivative_operator_latex(expr, var),
            "after": latex(exp(var)),
        }]

    if expr.func == log and expr.args[0] == var:
        return [{
            "step_number": current_idx,
            "rule": "log_rule",
            "description": "Производная ln(x) равна 1/x",
            "before": derivative_operator_latex(expr, var),
            "after": latex(diff(expr, var)),
        }]

    return [{
        "step_number": current_idx,
        "rule": "special_function",
        "description": "Для этого выражения доступен только итоговый результат производной.",
        "before": derivative_operator_latex(expr, var),
        "after": latex(diff(expr, var)),
    }]

@router.get("/derivative")
async def calculate_derivative(expr: str, var: str = "x"):
    try:
        x = symbols(var)
        parsed = sympify(expr)
        derivative = diff(parsed, x)
        data = {
            "plain_text": str(derivative),
            "latex": latex(derivative),
        }
        #сюда добавить строки добавления записи в db

        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@router.post("/derivative-steps", response_model=DerivativeResponseSchema)
async def get_derivative_steps(data: DerivativeRequestSchema):
    try:
        x = symbols(data.var)
        parsed = sympify(data.expr)
        derivative = diff(parsed, x)

        json_steps = format_derivative_steps(parsed, x)

        expanded_expr = parsed.expand()
        if expanded_expr != parsed:
            expanded_steps = format_derivative_steps(expanded_expr, x, start_index=2)
            if expanded_steps and expanded_steps[0]["rule"] != "special_function":
                json_steps = [{
                    "step_number": 1,
                    "rule": "expand_rule",
                    "description": "Раскрываем скобки перед дифференцированием",
                    "before": derivative_operator_latex(parsed, x),
                    "after": derivative_operator_latex(expanded_expr, x),
                }, *expanded_steps]

        return DerivativeResponseSchema(
            expression=data.expr,
            total_steps=len(json_steps),
            steps=json_steps,
            final_answer=latex(derivative),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка вычислений: {str(e)}")

@router.get("/evaluate")
async def evaluate_function(data: Annotated[EvaluateSchema, Depends()]):
    try:
        x = symbols(data.var)
        parsed = sympify(data.expr)
        derivative = diff(parsed, x)

        f = lambdify(x, parsed, modules="math")
        df = lambdify(x, derivative, modules="math")

        points = []
        step = (data.x_max - data.x_min) / (data.n_points - 1)
        for i in range(data.n_points):
            x_val = round(data.x_min + step * i, 6)
            entry: dict = {"x": x_val, "y": None, "dy": None}
            try:
                y = float(f(x_val))
                if math.isfinite(y):
                    # Keep large finite values — frontend clips them for singularity display
                    entry["y"] = round(min(max(y, -1e8), 1e8), 6)
            except Exception:
                pass
            try:
                dy = float(df(x_val))
                if math.isfinite(dy):
                    entry["dy"] = round(min(max(dy, -1e8), 1e8), 6)
            except Exception:
                pass
            points.append(entry)

        return {"points": points}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@router.get("/integral-evaluate")
async def evaluate_integral_function(data: Annotated[EvaluateSchema, Depends()]):
    try:
        x = symbols(data.var)
        parsed = sympify(data.expr)
        antiderivative = integrate(parsed, x)

        f = lambdify(x, parsed, modules="math")
        integral_f = lambdify(x, antiderivative, modules="math")

        points = []
        step = (data.x_max - data.x_min) / (data.n_points - 1)
        for i in range(data.n_points):
            x_val = round(data.x_min + step * i, 6)
            entry: dict = {"x": x_val, "y": None, "integral": None}
            try:
                y = float(f(x_val))
                if math.isfinite(y):
                    entry["y"] = round(min(max(y, -1e8), 1e8), 6)
            except Exception:
                pass
            try:
                integral_y = float(integral_f(x_val))
                if math.isfinite(integral_y):
                    entry["integral"] = round(min(max(integral_y, -1e8), 1e8), 6)
            except Exception:
                pass
            points.append(entry)

        return {"points": points}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")


@router.post("/integrate-steps", response_model=IntegralResponseSchema)
async def get_steps(data: IntegralRequestSchema):
    try:
        x = symbols(data.var)
        parsed = sympify(data.expr)

        # 1. Сразу вычисляем результат, чтобы final_latex была доступна всегда
        result = parsed.integrate(x)
        final_latex = f"{latex(result)} + C"

        # 2. Пытаемся получить шаги для исходного выражения
        steps_tree = integral_steps(parsed, x)
        json_steps = format_steps_json(steps_tree, x)

        # 3. Если шагов нет, пробуем раскрыть скобки (для примеров типа (x-1)^2)
        if not json_steps:
            expanded_expr = parsed.expand()
            if expanded_expr != parsed:
                steps_tree = integral_steps(expanded_expr, x)
                json_steps = format_steps_json(steps_tree, x)

                if json_steps:
                    # Добавляем поясняющий шаг в начало
                    json_steps.insert(0, {
                        "step_number": 1,
                        "rule": "expand_rule",
                        "description": "Раскроем скобки для упрощения выражения",
                        "before": latex(Integral(parsed, x)),
                        "after": latex(Integral(expanded_expr, x)),
                    })
                    # Пересчитываем нумерацию
                    for i, s in enumerate(json_steps):
                        s["step_number"] = i + 1

        # 4. Если шагов ВСЁ ЕЩЁ нет, тогда это действительно спец. функция
        if not json_steps:
            json_steps.append({
                "step_number": 1,
                "rule": "special_function",
                "description": "Интеграл не выражается в элементарных функциях или слишком сложен для пошагового разбора.",
                "before": latex(Integral(parsed, x)),
                "after": final_latex
            })

        return IntegralResponseSchema(
            expression=data.expr,
            total_steps=len(json_steps),
            steps=json_steps,
            final_answer=final_latex
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка вычислений: {str(e)}")