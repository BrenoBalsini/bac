import { Outlet } from "react-router";
import Navbar from "./NavBar";

export default function LayoutMain() {
  return (
    <div>
      <Navbar />

      <main>
        <Outlet />
      </main>
    </div>
  );
}
