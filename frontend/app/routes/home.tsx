import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SPRT"},
    { name: "description", content: "Welcome to SPRT!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
