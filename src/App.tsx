import { HashRouter, Route, Routes } from "react-router";
import "./App.css";
import LayoutMain from "./components/layouts/LayoutMain";
import RosterManagementPage from "./pages/RosterManagementPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<LayoutMain />}>
          <Route index element={<RosterManagementPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
