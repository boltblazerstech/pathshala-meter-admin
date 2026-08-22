import { Routes, Route, Navigate } from 'react-router-dom'

import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { PaathashaalaListPage } from './features/paathshaalas/PaathashaalaListPage'
import { SupervisorListPage } from './features/supervisors/SupervisorListPage'
import { TeacherListPage } from './features/teachers/TeacherListPage'
import { TrackingWindowListPage } from './features/trackingWindows/TrackingWindowListPage'
import { LiveViewPage } from './features/liveView/LiveViewPage'
import { ExportPage } from './features/export/ExportPage'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all inside AppShell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/paathshaalas" replace />} />
          <Route path="paathshaalas"      element={<PaathashaalaListPage />} />
          <Route path="supervisors"       element={<SupervisorListPage />} />
          <Route path="teachers"          element={<TeacherListPage />} />
          <Route path="tracking-windows"  element={<TrackingWindowListPage />} />
          <Route path="live-view"         element={<LiveViewPage />} />
          <Route path="export"            element={<ExportPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
