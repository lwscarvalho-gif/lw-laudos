import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface RouteGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export const AuthGuard: React.FC<RouteGuardProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  const { toast } = useToast()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F9F8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0C6B58] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#5F6E69]">Carregando sessão...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    toast({
      title: 'Acesso restrito',
      description: 'Acesso restrito a administradores.',
      variant: 'destructive',
    })
    return <Navigate to="/painel" replace />
  }

  return <>{children}</>
}
