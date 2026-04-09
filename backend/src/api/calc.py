import math
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sympy import symbols, diff, sympify, latex, lambdify, integrate, exp, sinh, cosh
from sympy.integrals.manualintegrate import *
from .schemas import EvaluateSchema, IntegralRequestSchema, IntegrationStepSchema, IntegralResponseSchema


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
        # В 1.14.0 это список, берем первый элемент
        sub_list = getattr(step, 'substeps', [])
        actual_substep = sub_list[0] if sub_list else step

        steps.append({
            "step_number": current_idx,
            "rule": "u_substitution",
            "description": f"Замена: $u = {latex(u_func)}$, тогда $du = {latex(u_func.diff(var))} dx$",
            "before": before_latex,
            "after": f"\\int {latex(getattr(actual_substep, 'integrand', 'f(u)'))} \\, du"
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
        v_du_expr = getattr(actual_substep, 'integrand', 'v \\cdot du')

        steps.append({
            "step_number": current_idx,
            "rule": "parts_rule",
            "description": f"Интегрирование по частям: $u = {latex(u)}$, $dv = {latex(dv)} dx$. "
                           f"Тогда $v = {latex(v_val) if v_val is not None else 'v'}$.",
            "before": before_latex,
            # latex(u * v_val) теперь не упадет, так как v_val — это формула, а не список
            "after": f"{latex(u * v_val if v_val is not None else u)} - \\int {latex(v_du_expr)} \\, d{var}"
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
            steps.append({
                "step_number": current_idx,
                "rule": "rewrite_rule",
                "description": description,
                "before": before_latex,
                "after": f"\\int {latex(getattr(substep, 'integrand', ''))} \\, d{var}"
            })
            # Рекурсивно идем вглубь этого правила
            steps.extend(format_steps_json(substep, var, start_index=len(steps) + start_index))

    else:
        print(f"DEBUG: Пропущено правило типа {type(step)}")

    return steps

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