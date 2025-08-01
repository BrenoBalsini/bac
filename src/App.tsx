// src/App.tsx
import { HashRouter, Route, Routes } from 'react-router';
import './App.css';
import LayoutMain from './components/layouts/LayoutMain';
import RosterManagementPage from './pages/RosterManagementPage';
import PostManagementPage from './pages/PostManagementPage';
import ScheduleGeneratorPage from './pages/ScheduleGeneratorPage';
import ScheduleHistoryPage from './pages/ScheduleHistoryPage';
import ScheduleViewerPage from './pages/ScheduleViewerPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<LayoutMain />}>
          <Route index element={<ScheduleGeneratorPage />} />
          <Route path="/roster" element={<RosterManagementPage />} />
          <Route path="/posts" element={<PostManagementPage />} />
          <Route path="/history" element={<ScheduleHistoryPage />} />
           <Route path="/history/:scheduleId" element={<ScheduleViewerPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}