import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'

// Public Auth Pages
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import AceitarConvite from '@/pages/AceitarConvite'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'

// Authenticated Pages
import Painel from '@/pages/Painel'
import Pacientes from '@/pages/Pacientes'
import PacienteDetalhes from '@/pages/PacienteDetalhes'
import Exames from '@/pages/Exames'
import ExameNovo from '@/pages/ExameNovo'
import ExameDetalhes from '@/pages/ExameDetalhes'
import Laudos from '@/pages/Laudos'
import LaudoNovo from '@/pages/LaudoNovo'
import LaudoDetalhes from '@/pages/LaudoDetalhes'
import LaudoEditar from '@/pages/LaudoEditar'
import Modelos from '@/pages/Modelos'
import ModeloNovo from '@/pages/ModeloNovo'
import ModeloEditar from '@/pages/ModeloEditar'
import Administracao from '@/pages/Administracao'
import Configuracoes from '@/pages/Configuracoes'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/aceitar-convite" element={<AceitarConvite />} />
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/painel" replace />} />

          {/* Authenticated Routes wrapped in Layout */}
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/painel" element={<Painel />} />

            {/* Pacientes */}
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/pacientes/:id" element={<PacienteDetalhes />} />

            {/* Exames */}
            <Route path="/exames" element={<Exames />} />
            <Route path="/exames/novo" element={<ExameNovo />} />
            <Route path="/exames/:id" element={<ExameDetalhes />} />

            {/* Laudos */}
            <Route path="/laudos" element={<Laudos />} />
            <Route path="/laudos/novo" element={<LaudoNovo />} />
            <Route path="/laudos/:id" element={<LaudoDetalhes />} />
            <Route path="/laudos/:id/editar" element={<LaudoEditar />} />

            {/* Modelos */}
            <Route path="/modelos" element={<Modelos />} />
            <Route path="/modelos/novo" element={<ModeloNovo />} />
            <Route path="/modelos/:id/editar" element={<ModeloEditar />} />

            {/* Configurações */}
            <Route path="/configuracoes" element={<Configuracoes />} />

            {/* Administração (Admin only) */}
            <Route
              path="/administracao"
              element={
                <AuthGuard requireAdmin>
                  <Administracao />
                </AuthGuard>
              }
            />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}
