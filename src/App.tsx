import { Outlet } from "react-router";
import "./styles.css";

export function App() {
  return (
    <main className="flex min-h-screen w-full flex-col">
      <Outlet />
    </main>
  );
}
