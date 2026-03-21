import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("me", "routes/me.tsx"),
  route("calculators/derivative", "routes/calculators/derivative.tsx"),
  layout("routes/auth-layout.tsx", [
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
  ]),
] satisfies RouteConfig;
