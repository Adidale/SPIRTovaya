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

# def format_steps_json(step, var, start_index=1):
#     steps = []
#     current_idx = start_index
#
#     raw_expr = getattr(step, 'integrand', getattr(step, 'context', step))
#     before_latex = f"\\int {latex(raw_expr)} \\, d{var}"
#     after_math = getattr(step, 'integral', None)
#
#     if isinstance(step, list):
#         if not step: return []
#         return format_steps_json(step[0], var, start_index)
#
#     elif isinstance(step, RewriteRule):
#         sub = getattr(step, 'substep', None)
#         if sub:
#             # Не просто добавляем описание, а ОБЯЗАТЕЛЬНО идем глубже
#             steps.extend(format_steps_json(sub, var, start_index=start_index))
#
#     elif isinstance(step, ExpRule):
#         after_math = getattr(step, 'integral', exp(var))
#
#         steps.append({
#             "step_number": current_idx,
#             "rule": "exp_rule",
#             "description": "Интеграл от экспоненты равен самой экспоненте",
#             "before": before_latex,
#             "after": latex(after_math)
#         })
#
#     elif isinstance(step, (SinRule, CosRule)):
#         after_math = getattr(step, 'integral', None)
#         if after_math is None:
#             from sympy import sin, cos
#             after_math = -cos(var) if isinstance(step, SinRule) else sin(var)
#
#         steps.append({
#             "step_number": current_idx,
#             "rule": "trig_rule",
#             "description": "Интегрирование тригонометрической функции",
#             "before": before_latex,
#             "after": latex(after_math)
#         })
#
#     elif isinstance(step, PowerRule):
#         if after_math is None: after_math = (step.base ** (step.exp + 1)) / (step.exp + 1)
#         steps.append({
#             "step_number": current_idx, "rule": "power_rule",
#             "description": "Правило степени",
#             "before": before_latex, "after": latex(after_math)
#         })
#
#     elif isinstance(step, ConstantRule):
#         const = getattr(step, 'constant', 1)
#         steps.append({
#             "step_number": current_idx, "rule": "constant_rule",
#             "description": "Интеграл константы",
#             "before": before_latex, "after": latex(const * var)
#         })
#
#     elif isinstance(step, ConstantTimesRule):
#         const = getattr(step, 'constant', 1)
#         steps.append({
#             "step_number": current_idx, "rule": "constant_times_rule",
#             "description": f"Вынос константы {latex(const)}",
#             "before": before_latex,
#             "after": f"{latex(const)} \\cdot \\int {latex(getattr(step.substep, 'integrand', ''))} \\, d{var}"
#         })
#         steps.extend(format_steps_json(step.substep, var, start_index=len(steps) + start_index))
#
#     elif isinstance(step, AddRule):
#         substeps = getattr(step, 'substeps', [])
#         steps.append({
#             "step_number": current_idx, "rule": "sum_rule",
#             "description": "Разбиение суммы",
#             "before": before_latex,
#             "after": " + ".join([f"\\int {latex(getattr(s, 'integrand', s))} \\, d{var}" for s in substeps])
#         })
#         for substep in substeps:
#             steps.extend(format_steps_json(substep, var, start_index=len(steps) + start_index))
#
#     elif isinstance(step, URule):
#         u_var = step.u_var
#         u_func = step.u_func
#         sub_step = getattr(step, 'substep', None)
#
#         # Получаем чистый интеграл от u (без иксов)
#         u_integrand = getattr(sub_step, 'integrand', 'f(u)')
#
#         # Очищаем описание от технических скобок \left \right
#         description = (f"Введем замену переменной: пусть ${latex(u_var)} = {latex(u_func)}$. "
#                        f"Тогда $d{latex(u_var)} = {latex(u_func.diff(var))} \, d{var}$")
#         description = description.replace('\\left(', '(').replace('\\right)', ')')
#
#         res_u = manualintegrate(step.substep, u_var)
#
#         steps.append({
#             "step_number": len(steps) + start_index,
#             "rule": "u_substitution_revert",
#             "description": f"Выполним обратную замену: подставим ${latex(u_func)}$ вместо ${latex(u_var)}$",
#             "before": latex(res_u),  # Теперь здесь будет результат через u
#             "after": latex(after_math)  # А здесь уже финальный результат через x
#         })
#
#         # Рекурсивно добавляем шаги для интеграла по u
#         if sub_step:
#             steps.extend(format_steps_json(sub_step, u_var, start_index=len(steps) + start_index + 1))
#
#         # Добавляем шаг обратной замены, чтобы юзер видел переход u -> x
#         steps.append({
#             "step_number": len(steps) + start_index + 1,
#             "rule": "u_substitution_revert",
#             "description": f"Выполним обратную замену: подставим ${latex(u_func)}$ вместо ${latex(u_var)}$",
#             "before": f"{latex(getattr(sub_step, 'integral', ''))}",
#             "after": latex(after_math) if after_math else "..."
#         })
#
#         # --- ИСПРАВЛЕННЫЙ PartsRule ---
#
#     elif isinstance(step, PartsRule):
#         u = step.u
#         dv = step.dv
#         v_step = step.v_step
#
#         # 1. Извлекаем v и du
#         v_val = getattr(v_step, 'integral', dv.integrate(var))
#         du_val = u.diff(var)
#         v_du_expr = (v_val * du_val).simplify()
#
#         # 2. Добавляем основной шаг "по частям"
#         steps.append({
#             "step_number": current_idx,
#             "rule": "parts_rule",
#             "description": f"Интегрирование по частям: $u = {latex(u)}$, $dv = {latex(dv)} dx \\Rightarrow du = {latex(du_val)} dx, v = {latex(v_val)}$.",
#             "before": before_latex,
#             "after": f"{latex(u * v_val)} - \\int {latex(v_du_expr)} \\, d{var}"
#         })
#
#         # 3. Рекурсивно ищем шаги для интеграла (v * du)
#         sub_list = getattr(step, 'substeps', [])
#         actual_substep = sub_list if (isinstance(sub_list, list) and len(sub_list) > 0) else sub_list
#
#         # Запускаем рекурсию
#         inner_steps = []
#         if actual_substep:
#             inner_steps = format_steps_json(actual_substep, var, start_index=len(steps) + start_index)
#
#         # ПРОВЕРКА: Если рекурсия не нашла шагов (как для интеграла от 1)
#         if not inner_steps:
#             steps.append({
#                 "step_number": len(steps) + start_index,
#                 "rule": "final_substep",
#                 "description": "Вычислим оставшийся интеграл",
#                 "before": f"\\int {latex(v_du_expr)} \\, d{var}",
#                 "after": latex(v_du_expr.integrate(var))
#             })
#         else:
#             steps.extend(inner_steps)
#
#     elif isinstance(step, AlternativeRule):
#         # AlternativeRule содержит список стратегий в атрибуте alternatives.
#         # Мы выбираем первую (обычно самую оптимальную) и продолжаем рекурсию.
#         best_strategy = step.alternatives[0]
#         return format_steps_json(best_strategy, var, start_index=current_idx)
#
#     else:
#         print(f"DEBUG: Пропущено правило типа {type(step)}")
#
#     return steps

def format_steps_json(step, var, start_index=1):
    if isinstance(step, list):
        all_steps = []
        for s in step:
            all_steps.extend(format_steps_json(s, var, start_index=start_index + len(all_steps)))
        return all_steps

    steps = []
    current_idx = start_index

    # Безопасное получение математики для LaTeX
    raw_expr = getattr(step, 'integrand', getattr(step, 'context', step))
    before_latex = f"\\int {latex(raw_expr)} \\, d{latex(var)}"
    after_math = getattr(step, 'integral', None)

    if isinstance(step, URule):
        u_var, u_func = step.u_var, step.u_func
        sub_list = getattr(step, 'substeps', getattr(step, 'substep', []))
        actual_sub = sub_list[0] if isinstance(sub_list, list) and sub_list else sub_list

        # Вычисляем промежуточный результат по u для шага обратной замены
        from sympy.integrals.manualintegrate import manualintegrate
        # Передаем только математическое выражение из actual_sub, а не само правило!
        res_u = manualintegrate(getattr(actual_sub, 'integrand', actual_sub), u_var)

        steps.append({
            "step_number": current_idx, "rule": "u_substitution",
            "description": f"Замена: $u = {latex(u_func)}$, тогда $du = {latex(u_func.diff(var))} dx$".replace('\\left(',
                                                                                                               '(').replace(
                '\\right)', ')'),
            "before": before_latex,
            "after": f"\\int {latex(getattr(actual_sub, 'integrand', 'f(u)'))} \\, d{latex(u_var)}"
        })

        steps.extend(format_steps_json(actual_sub, u_var, start_index=len(steps) + start_index))

        # Теперь before не будет пустым, а after не будет None
        steps.append({
            "step_number": len(steps) + start_index, "rule": "u_substitution_revert",
            "description": f"Обратная замена: подставим ${latex(u_func)}$ вместо $u$",
            "before": latex(res_u),
            "after": latex(res_u.subs(u_var, u_func))
        })

    # --- ИСПРАВЛЕННЫЙ PartsRule ---
    elif isinstance(step, PartsRule):
        u, dv, v_step = step.u, step.dv, step.v_step
        # Берем результат v из v_step или считаем напрямую
        v_val = getattr(v_step, 'integral', dv.integrate(var))

        sub_list = getattr(step, 'substeps', [])
        actual_sub = sub_list[0] if (isinstance(sub_list, list) and sub_list) else sub_list
        v_du = (v_val * u.diff(var)).simplify()

        steps.append({
            "step_number": current_idx, "rule": "parts_rule",
            "description": f"По частям: $u={latex(u)}, dv={latex(dv)}dx \Rightarrow v={latex(v_val)}$",
            "before": before_latex,
            "after": f"{latex(u * v_val)} - \\int {latex(v_du)} \\, d{latex(var)}"
        })

        if actual_sub:
            # Рекурсивно добавляем шаги для интеграла v*du
            inner = format_steps_json(actual_sub, var, start_index=len(steps) + start_index)
            if not inner:  # Если это простейший интеграл, добавляем его вычисление вручную
                steps.append({
                    "step_number": len(steps) + start_index,
                    "rule": "final_substep",
                    "description": "Вычислим оставшийся интеграл",
                    "before": f"\\int {latex(v_du)} \\, d{latex(var)}",
                    "after": latex(v_du.integrate(var))
                })
            else:
                steps.extend(inner)

    # 3. СУММА (AddRule)
    elif isinstance(step, AddRule):
        substeps = getattr(step, 'substeps', [])
        after_parts = [f"\\int {latex(getattr(s, 'integrand', s))} \\, d{latex(var)}" for s in substeps]
        steps.append({
            "step_number": current_idx, "rule": "sum_rule",
            "description": "Разбиение на сумму интегралов",
            "before": before_latex, "after": " + ".join(after_parts)
        })
        for s in substeps:
            steps.extend(format_steps_json(s, var, start_index=len(steps) + start_index))

    # 4. БАЗОВЫЕ ПРАВИЛА (Степень, Exp, Sin, Cos)
    elif isinstance(step, PowerRule):
        steps.append({
            "step_number": current_idx, "rule": "power_rule",
            "description": "Правило степени",
            "before": before_latex,
            "after": latex(after_math if after_math else (step.base ** (step.exp + 1)) / (step.exp + 1))
        })
    elif isinstance(step, ExpRule):
        steps.append({
            "step_number": current_idx, "rule": "exp_rule", "description": "Интеграл экспоненты",
            "before": before_latex, "after": latex(after_math if after_math else exp(var))
        })
    elif isinstance(step, ConstantTimesRule):
        c = getattr(step, 'constant', 1)
        steps.append({
            "step_number": current_idx, "rule": "mul_rule", "description": f"Вынос константы {latex(c)}",
            "before": before_latex,
            "after": f"{latex(c)} \\cdot \\int {latex(getattr(step.substep, 'integrand', ''))} \\, d{latex(var)}"
        })
        steps.extend(format_steps_json(step.substep, var, start_index=len(steps) + start_index))

    # 5. АЛЬТЕРНАТИВЫ И УПРОЩЕНИЯ
    elif isinstance(step, AlternativeRule):
        steps.extend(format_steps_json(step.alternatives[0], var, start_index=current_idx))
    elif isinstance(step, RewriteRule):
        if step.substeps: steps.extend(format_steps_json(step.substeps, var, start_index=current_idx))

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