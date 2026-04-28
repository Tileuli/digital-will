import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import authService from './services/auth'

// Layouts
import MainLayout from './layouts/MainLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/dashboard/Dashboard'
import VaultPage from './pages/dashboard/VaultPage'
import RecipientsPage from './pages/dashboard/RecipientsPage'
import CheckinsPage from './pages/dashboard/CheckinsPage'
import ActivityPage from './pages/dashboard/ActivityPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import RecipientSetup from './pages/RecipientSetup'
import RecipientClaim from './pages/RecipientClaim'
import RecipientVerify from './pages/RecipientVerify'
import Recover from './pages/Recover'
import ConfirmerAccept from './pages/ConfirmerAccept'
import ConfirmerVote from './pages/ConfirmerVote'

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recipient/setup" element={<RecipientSetup />} />
        <Route path="/recipient/claim" element={<RecipientClaim />} />
        <Route path="/recipient/verify" element={<RecipientVerify />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/confirmer/accept" element={<ConfirmerAccept />} />
        <Route path="/confirmer/vote" element={<ConfirmerVote />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="recipients" element={<RecipientsPage />} />
          <Route path="checkins" element={<CheckinsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <Toaster position="top-right" />
    </>
  )
}

export default App