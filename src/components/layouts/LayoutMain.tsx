import { Outlet } from "react-router";

export default function LayoutMain() {
  return (
    <div>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
