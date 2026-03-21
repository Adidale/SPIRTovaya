import type { Route } from "./+types/home";
import { Welcome } from "~/welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "СПРТ"},
    { name: "description", content: "Welcome to СПРТ!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
