import { Outlet } from "react-router";

export function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#fafafa",
        color: "#1f1f1f",
      }}
    >
      <Outlet />
    </main>
  );
}
