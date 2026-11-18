import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { BugDetailPage } from './pages/BugDetailPage'
import { BugFormPage } from './pages/BugFormPage'
import { BugsPage } from './pages/BugsPage'
import { LoginPage } from './pages/LoginPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { RoleDetailPage } from './pages/RoleDetailPage'
import { RolesPage } from './pages/RolesPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { UserFormPage } from './pages/UserFormPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            {/* 1) ¿hay sesión? */}
            <Route element={<Layout />}>
              {/* 2) menú, Salir */}
              <Route path="/bugs" element={<BugsPage />} />
              <Route path="/bugs/new" element={<BugFormPage />} />
              <Route path="/bugs/:id" element={<BugDetailPage />} />
              <Route path="/bugs/:id/edit" element={<BugFormPage />} />

              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/new" element={<UserFormPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/users/:id/edit" element={<UserFormPage />} />

              <Route path="/roles" element={<RolesPage />} />
              <Route path="/roles/:id" element={<RoleDetailPage />} />

              <Route path="/permissions" element={<PermissionsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/bugs" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
