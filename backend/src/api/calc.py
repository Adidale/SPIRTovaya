import math
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sympy import symbols, diff, sympify, latex, lambdify, integrate, exp, sinh, cosh
from sympy.integrals.manualintegrate import *
from .schemas import EvaluateIntegralSchema, EvaluateDerivativeSchema, IntegralRequestSchema, IntegralResponseSchema, OrbitalTransfersSchema


router = APIRouter(prefix="/calculate", tags=['Calculations'])

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
    before_latex = f"\\int {latex(raw_expr)} \\, d{var}"
    after_math = getattr(step, 'integral', None)

    if isinstance(step, list):
        if not step: return []
        return format_steps_json(step[0], var, start_index)

    elif isinstance(step, RewriteRule):
        sub = getattr(step, 'substep', None)
        if sub:
            # Не просто добавляем описание, а ОБЯЗАТЕЛЬНО идем глубже
            steps.extend(format_steps_json(sub, var, start_index=start_index))

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
        steps.append({
            "step_number": current_idx, "rule": "constant_times_rule",
            "description": f"Вынос константы {latex(const)}",
            "before": before_latex,
            "after": f"{latex(const)} \\cdot \\int {latex(getattr(step.substep, 'integrand', ''))} \\, d{var}"
        })
        steps.extend(format_steps_json(step.substep, var, start_index=len(steps) + start_index))

    elif isinstance(step, AddRule):
        substeps = getattr(step, 'substeps', [])
        steps.append({
            "step_number": current_idx, "rule": "sum_rule",
            "description": "Разбиение суммы",
            "before": before_latex,
            "after": " + ".join([f"\\int {latex(getattr(s, 'integrand', s))} \\, d{var}" for s in substeps])
        })
        for substep in substeps:
            steps.extend(format_steps_json(substep, var, start_index=len(steps) + start_index))

    elif isinstance(step, URule):
        u_var = step.u_var
        u_func = step.u_func
        sub_step = getattr(step, 'substep', None)

        # Получаем чистый интеграл от u (без иксов)
        u_integrand = getattr(sub_step, 'integrand', 'f(u)')

        # Очищаем описание от технических скобок \left \right
        description = (f"Введем замену переменной: пусть ${latex(u_var)} = {latex(u_func)}$. "
                       f"Тогда $d{latex(u_var)} = {latex(u_func.diff(var))} \, d{var}$")
        description = description.replace('\\left(', '(').replace('\\right)', ')')

        res_u = manualintegrate(step.substep, u_var)

        steps.append({
            "step_number": len(steps) + start_index,
            "rule": "u_substitution_revert",
            "description": f"Выполним обратную замену: подставим ${latex(u_func)}$ вместо ${latex(u_var)}$",
            "before": latex(res_u),  # Теперь здесь будет результат через u
            "after": latex(after_math)  # А здесь уже финальный результат через x
        })

        # Рекурсивно добавляем шаги для интеграла по u
        if sub_step:
            steps.extend(format_steps_json(sub_step, u_var, start_index=len(steps) + start_index + 1))

        # Добавляем шаг обратной замены, чтобы юзер видел переход u -> x
        steps.append({
            "step_number": len(steps) + start_index + 1,
            "rule": "u_substitution_revert",
            "description": f"Выполним обратную замену: подставим ${latex(u_func)}$ вместо ${latex(u_var)}$",
            "before": f"{latex(getattr(sub_step, 'integral', ''))}",
            "after": latex(after_math) if after_math else "..."
        })

        # --- ИСПРАВЛЕННЫЙ PartsRule ---

    elif isinstance(step, PartsRule):
        u = step.u
        dv = step.dv
        v_step = step.v_step

        # 1. Извлекаем v и du
        v_val = getattr(v_step, 'integral', dv.integrate(var))
        du_val = u.diff(var)
        v_du_expr = (v_val * du_val).simplify()

        # 2. Добавляем основной шаг "по частям"
        steps.append({
            "step_number": current_idx,
            "rule": "parts_rule",
            "description": f"Интегрирование по частям: $u = {latex(u)}$, $dv = {latex(dv)} dx \\Rightarrow du = {latex(du_val)} dx, v = {latex(v_val)}$.",
            "before": before_latex,
            "after": f"{latex(u * v_val)} - \\int {latex(v_du_expr)} \\, d{var}"
        })

        # 3. Рекурсивно ищем шаги для интеграла (v * du)
        sub_list = getattr(step, 'substeps', [])
        actual_substep = sub_list if (isinstance(sub_list, list) and len(sub_list) > 0) else sub_list

        # Запускаем рекурсию
        inner_steps = []
        if actual_substep:
            inner_steps = format_steps_json(actual_substep, var, start_index=len(steps) + start_index)

        # ПРОВЕРКА: Если рекурсия не нашла шагов (как для интеграла от 1)
        if not inner_steps:
            steps.append({
                "step_number": len(steps) + start_index,
                "rule": "final_substep",
                "description": "Вычислим оставшийся интеграл",
                "before": f"\\int {latex(v_du_expr)} \\, d{var}",
                "after": latex(v_du_expr.integrate(var))
            })
        else:
            steps.extend(inner_steps)

    elif isinstance(step, AlternativeRule):
        # AlternativeRule содержит список стратегий в атрибуте alternatives.
        # Мы выбираем первую (обычно самую оптимальную) и продолжаем рекурсию.
        best_strategy = step.alternatives[0]
        return format_steps_json(best_strategy, var, start_index=current_idx)

    else:
        print(f"DEBUG: Пропущено правило типа {type(step)}")

    return steps

def format_derivative_steps(expr, var, step_num=1):
    steps = []

    if expr.func == exp:
        inner = expr.args[0]
        if inner != var:
            steps.append({
                "step_number": step_num,
                "rule": "exp_chain_rule",
                "description": f"Производная экспоненты: $(e^u)' = e^u \cdot u'$. Внутренняя функция $u = {latex(inner)}$.",
                "before": rf"\frac{{d}}{{d{latex(var)}}} \left( {latex(expr)} \right)",
                "after": rf"{latex(expr)} \cdot \frac{{d}}{{d{latex(var)}}} \left( {latex(inner)} \right)"
            })
            # Рекурсивно идем в производную степени (там сработает логарифмическое правило для x^x)
            steps.extend(format_derivative_steps(inner, var, len(steps) + step_num))
            return steps

    elif expr.is_Pow and expr.base == E:
        inner = expr.exp
        if inner != var:
            steps.append({
                "step_number": step_num,
                "rule": "exp_chain_rule",
                "description": f"Производная экспоненты: $(e^u)' = e^u \cdot u'$. Внутренняя функция $u = {latex(inner)}$.",
                "before": rf"\frac{{d}}{{d{latex(var)}}} \left( {latex(expr)} \right)",
                "after": rf"{latex(expr)} \cdot \frac{{d}}{{d{latex(var)}}} \left( {latex(inner)} \right)"
            })
            steps.extend(format_derivative_steps(inner, var, len(steps) + step_num))
            return steps

    elif expr.func == log and len(expr.args) > 1:
        base = expr.args[1]
        arg = expr.args[0]
        # Показываем формулу перехода к натуральному логарифму
        steps.append({
            "step_number": step_num,
            "rule": "log_base_change",
            "description": f"Перейдем к натуральному логарифму: $\\log_{{{latex(base)}}}(x) = \\frac{{\\ln(x)}}{{\\ln({latex(base)})}}$.",
            "before": f"\\frac{{d}}{{d{latex(var)}}} \\left( {latex(expr)} \\right)",
            "after": f"\\frac{{1}}{{\\ln({latex(base)})}} \\cdot \\frac{{d}}{{d{latex(var)}}} \\left( \\ln({latex(arg)}) \\right)"
        })
        steps.extend(format_derivative_steps(log(arg), var, len(steps) + step_num))
        return steps

    elif len(expr.args) == 1 and not expr.is_Symbol and expr.args[0] != var:
        inner = expr.args[0]
        u_sym = symbols('u')
        outer_f = expr.func(u_sym)
        steps.append({
            "step_number": step_num,
            "rule": "chain_rule",
            "description": f"Сложная функция: внешняя ${latex(outer_f)}$, внутренняя $u = {latex(inner)}$.",
            "before": rf"\frac{{d}}{{d{latex(var)}}} \left( {latex(expr)} \right)",
            "after": rf"\frac{{d}}{{du}} ({latex(outer_f)}) \cdot \frac{{d}}{{d{latex(var)}}} \left( {latex(inner)} \right)"
        })
        steps.extend(format_derivative_steps(inner, var, len(steps) + step_num))
        return steps

    if expr.is_Add:
        after_parts = [f"\\frac{{d}}{{d{latex(var)}}} ({latex(arg)})" for arg in expr.args]
        steps.append({
            "step_number": step_num, "rule": "sum_rule",
            "description": "Производная суммы равна сумме производных",
            "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
            "after": " + ".join(after_parts)
        })
        for arg in expr.args:
            steps.extend(format_derivative_steps(arg, var, len(steps) + step_num))
        return steps

    # 2. ВЫНОС КОНСТАНТЫ (Множитель)
    if expr.is_Mul:
        coeffs, factors = expr.as_coeff_Mul()
        if coeffs != 1:
            steps.append({
                "step_number": step_num,
                "rule": "constant_mul_rule",
                "description": f"Вынесем константу ${latex(coeffs)}$ за знак производной.",
                "before": f"\\frac{{d}}{{d{latex(var)}}} \\left( {latex(expr)} \\right)",
                "after": f"{latex(coeffs)} \\cdot \\frac{{d}}{{d{latex(var)}}} \\left( {latex(factors)} \\right)"
            })
            # Рекурсия для оставшейся части
            steps.extend(format_derivative_steps(factors, var, len(steps) + step_num))
            return steps

    if expr.is_Pow and not expr.exp.is_number:
        base = expr.base
        exponent = expr.exp

        # Проверяем, что оба зависят от переменной
        if var in base.free_symbols and var in exponent.free_symbols:
            steps.append({
                "step_number": step_num,
                "rule": "log_diff_rule",
                "description": (
                    f"Функция вида $f(x)^{{g(x)}}$. Используем логарифмическое дифференцирование: "
                    f"представим как $e^{{{latex(exponent)} \\cdot \\ln({latex(base)})}}$."
                ),
                "before": f"\\frac{{d}}{{d{latex(var)}}} \\left( {latex(expr)} \\right)",
                "after": rf"\frac{{d}}{{d{latex(var)}}} \left( e^{{{latex(exponent * log(base))}}} \right)"
            })

            # Далее производная пойдет по Chain Rule (экспонента)
            new_expr = exp(exponent * log(base))
            steps.extend(format_derivative_steps(new_expr, var, len(steps) + step_num))
            return steps

    # 4. ЦЕПНОЕ ПРАВИЛО (Сложная функция)
    # Если это функция (не символ и не число) и ее аргумент - не просто переменная 'x'
    if len(expr.args) == 1 and not expr.is_Symbol and expr.args[0] != var:
        inner = expr.args[0]
        u_sym = symbols('u')
        outer_f = expr.func(u_sym)
        steps.append({
            "step_number": step_num, "rule": "chain_rule",
            "description": f"Сложная функция: внешняя ${latex(outer_f)}$, внутренняя $u = {latex(inner)}$",
            "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
            "after": f"\\frac{{d}}{{du}} ({latex(outer_f)}) \\cdot \\frac{{d}}{{d{latex(var)}}} ({latex(inner)})"
        })
        steps.extend(format_derivative_steps(inner, var, len(steps) + step_num))
        return steps

    # 5. БАЗОВОЕ ПРАВИЛО (Таблица)
    res = diff(expr, var)
    steps.append({
        "step_number": step_num, "rule": "base_rule",
        "description": f"По таблице производных для ${latex(expr)}$ получаем ${latex(res)}$",
        "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
        "after": latex(res)
    })

    return steps

# def format_derivative_steps(expr, var, step_num=1):
#     steps = []
#
#     # --- 1. ПРАВИЛО ЧАСТНОГО (ДРОБИ) ---
#     # Проверяем, является ли выражение дробью
#     if expr.is_Pow and expr.exp.is_negative:
#         # Для выражений типа 1/x или u/v
#         u = sympify(1)  # числитель (условно)
#         v = expr.base ** (-expr.exp)  # знаменатель
#
#         steps.append({
#             "step_number": step_num,
#             "rule": "quotient_rule",
#             "description": "Применим правило частного: $(\\frac{u}{v})' = \\frac{u'v - uv'}{v^2}$.",
#             "before": f"\\frac{{d}}{{d{latex(var)}}} (\\frac{{{latex(u)}}}{{{latex(v)}}})",
#             "after": f"\\frac{{{latex(diff(u, var))} \\cdot {latex(v)} - {latex(u)} \\cdot {latex(diff(v, var))}}}{{{latex(v ** 2)}}}"
#         })
#         # Рекурсия для числителя и знаменателя, если они сложные
#         steps.extend(format_derivative_steps(v, var, len(steps) + step_num))
#
#     # --- 2. ПРАВИЛО СТЕПЕНИ (x^n) ---
#     elif isinstance(expr, Pow):
#         base = expr.base
#         exp = expr.exp
#
#         # Если основание — это переменная x, а степень — число
#         if base == var and exp.is_number:
#             res = exp * base ** (exp - 1)
#             steps.append({
#                 "step_number": step_num,
#                 "rule": "power_rule",
#                 "description": f"Применим правило степени: $(x^n)' = n \\cdot x^{{n-1}}$.",
#                 "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
#                 "after": latex(res)
#             })
#         else:
#             # Если это сложная функция типа (sin(x))^2, сработает Chain Rule
#             # которое мы писали ранее
#             pass
#
#     # 1. Правило суммы: (f + g)'
#     elif expr.is_Add:
#         after_parts = [f"\\frac{{d}}{{d{latex(var)}}} ({latex(arg)})" for arg in expr.args]
#         steps.append({
#             "step_number": step_num,
#             "rule": "sum_rule",
#             "description": "Производная суммы равна сумме производных",
#             "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
#             "after": " + ".join(after_parts)
#         })
#         for arg in expr.args:
#             steps.extend(format_derivative_steps(arg, var, len(steps) + step_num))
#
#     # 2. Правило произведения: (u * v)'
#     elif expr.is_Mul:
#         # Ищем знаменатель (степень -1)
#         denom_part = [arg for arg in expr.args if arg.is_Pow and arg.exp.is_negative]
#         if denom_part:
#             v = denom_part[0].base ** (-denom_part[0].exp)
#             u = expr / denom_part[0]
#
#             res_val = (diff(u, var) * v - u * diff(v, var)) / (v ** 2)
#             steps.append({
#                 "step_number": step_num,
#                 "rule": "quotient_rule",
#                 "description": "Применим правило частного: $(\\frac{u}{v})' = \\frac{u'v - uv'}{v^2}$",
#                 "before": f"\\frac{{d}}{{d{latex(var)}}} \\left( \\frac{{{latex(u)}}}{{{latex(v)}}} \\right)",
#                 "after": latex(res_val)
#             })
#             # Рекурсивно идем в числитель и знаменатель
#             steps.extend(format_derivative_steps(u, var, len(steps) + step_num))
#             steps.extend(format_derivative_steps(v, var, len(steps) + step_num))
#             return steps
#
#     # 3. СЛОЖНАЯ ФУНКЦИЯ (Chain Rule): f(g(x))
#     elif len(expr.args) == 1 and not expr.is_Symbol:
#         inner = expr.args[0]  # Внутренняя функция g(x)
#         if inner != var:
#             # Создаем временную переменную 'u' для наглядности
#             u = symbols('u')
#             outer_f = expr.func(u)
#             steps.append({
#                 "step_number": step_num,
#                 "rule": "chain_rule",
#                 "description": f"Сложная функция: внешняя ${latex(outer_f)}$, внутренняя $u = {latex(inner)}$.",
#                 "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
#                 "after": f"\\frac{{d}}{{du}} ({latex(outer_f)}) \\cdot \\frac{{d}}{{d{latex(var)}}} ({latex(inner)})"
#             })
#             # Добавляем шаги для внутренней части
#             steps.extend(format_derivative_steps(inner, var, len(steps) + step_num))
#
#     # 4. Базовое правило (степень, sin, cos и т.д.)
#     else:
#         res = diff(expr, var)
#         steps.append({
#             "step_number": step_num,
#             "rule": "base_rule",
#             "description": f"Используем таблицу производных для ${latex(expr)}$.",
#             "before": f"\\frac{{d}}{{d{latex(var)}}} ({latex(expr)})",
#             "after": latex(res)
#         })
#
#     return steps

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

#выведение точек графиков производной и интегралов
@router.get("/evaluate-derivative")
async def evaluate_function(data: Annotated[EvaluateDerivativeSchema, Depends()]):
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

@router.get('/evaluate-integrate')
async def evaluate_function(data: Annotated[EvaluateIntegralSchema, Depends()]):
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

#поэтапное вычисление производных и интегралов
@router.post("/derivative-steps")
async def get_derivative_steps(data: IntegralRequestSchema):
    try:
        x = symbols(data.var)
        # ВАЖНО: используем evaluate=False, чтобы SymPy не упрощал log(x, 10) в дробь сразу
        clean_expr = data.expr.replace('e**', 'exp')
        expr = sympify(clean_expr, evaluate=False)

        # Теперь функция format_derivative_steps увидит именно логарифм с основанием 10
        json_steps = format_derivative_steps(expr, x)

        # Финальный результат считаем как обычно (с упрощением)
        final_res = diff(expr, x)

        return {
            "expression": data.expr,
            "steps": json_steps,
            "final_answer": latex(final_res)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
                        "before": f"\\int {latex(parsed)} \\, d{data.var}",
                        "after": f"\\int {latex(expanded_expr)} \\, d{data.var}"
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
                "before": f"\\int {latex(parsed)} \\, d{data.var}",
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

#вычисление орбитальных переходов
@router.post('/orbital-transfers')
async def orbital_transfers(data: OrbitalTransfersSchema):
    # данные первой орбиты
    i1 = data.inclination_1  # наконение (градусы)
    h1 = data.h1  # высота (км)

    # данные второй орбиты
    i2 = data.inclination_2  # наконение (градусы)
    h2 = data.h2  # высота (км)

    # константы и другие данные
    G = 6.67 * 10 ** (-11)  # (м**3 / кг * с**2)
    Mz = 5.9722 * 10 ** 24  # (кг)
    mz = G * Mz / 1000 ** 3  # земная гравитационная константа (км**3 / с**2)
    Rz = 6371  # радиус земли (км)
    # Mrb = 6475 # масса разгонного блока (кг)
    # Ma = 280  # масса аппарата (кг)
    # Mk = Mrb + Ma  # масса конструкции (кг)
    Mk = data.sat_mass

    di = math.radians(abs(i2 - i1))  # изменение угла в радианах(питон считает в радианах)
    Iyd = data.impulse  # удельный импульс двигателя в вакууме (км/c)
    Pdy = data.force  # сила тяги двигатьной установки (кг·км/с**2)

    Vnoo = math.sqrt(mz * (1 / (Rz + h1)))  # круговая скорость на низкой околоемной орбите
    Vc = math.sqrt(mz * (1 / (Rz + h2)))  # круговая скорость на целевой орбите
    a = (2 * Rz + h1 + h2) / 2
    Vp = math.sqrt(mz * ((2 / (Rz + h1)) - (1 / a)))  # скорость в перегее
    Va = math.sqrt(mz * ((2 / (Rz + h2)) - (1 / a)))  # скорость в апогее
    dV1 = Vp - Vnoo  # изменение скорости 1
    dV2 = 2 * Va * math.sin(di / 2)  # изменение скорости 2
    dV3 = Vc - Va  # изменение скорости 3
    dV = dV1 + dV2 + dV3  # суммарное изменение скорости

    Mt = Mk * (math.e ** (dV / Iyd) - 1)  # масса топлива
    Mrst = Pdy / Iyd  # расход топлива
    t = Mt / Mrst  # время работы двигателя

    Mt1 = (Mk + Mt) * (1 - math.e ** (-dV1 / Iyd))  # масса топлива за 1 включение
    Mt2 = (Mk + Mt - Mt1) * (1 - math.e ** (-dV2 / Iyd))  # масса топлива за 2 включение
    Mt3 = (Mk + Mt - Mt1 - Mt2) * (1 - math.e ** (-dV3 / Iyd))  # масса топлива за 3 включение

    t1 = Mt1 / Mrst  # время включения двигателя для 1 импульса
    t2 = Mt2 / Mrst  # время включения двигателя для 2 импульса
    t3 = Mt3 / Mrst  # время включения двигателя для 3 импульса

    return {
        "start_data": {
            'sat_mass':Mk,
            'i1':i1,
            'h1':h1,
            'i2':i2,
            'h2':h2,
            'force': Pdy,
            'impulse':Iyd
        },
        "answer": {
            'Mrst':Mrst,
            'dV1':dV1,
            'dV2':dV2,
            'dV3':dV3,
            'Mt1':Mt1,
            'Mt2':Mt2,
            'Mt3':Mt3,
            't1':t1,
            't2':t2,
            't3':t3
        }
    }