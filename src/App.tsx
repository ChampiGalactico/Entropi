import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import {
  DashboardPage,
  CalendarPage,
  SubjectsPage,
  SubjectDetailPage,
  GradesPage,
  TasksPage,
  PlannerPage,
  NotesPage,
  NoteEditorPage,
  SettingsPage,
} from "./pages";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/:id" element={<SubjectDetailPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/:id" element={<NoteEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
