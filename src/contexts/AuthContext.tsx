import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  isAdmin: boolean
  isDoctor: boolean
  isSecretary: boolean
  isManager: boolean
  isAccounting: boolean
  isOperator: boolean
  operatorAllowedClinics: string[]
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<User | null>
  requestPasswordReset: (email: string) => Promise<boolean>
  confirmPasswordReset: (
    token: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<boolean>
  requestVerification: (email: string) => Promise<boolean>
  confirmVerification: (token: string) => Promise<boolean>
  requestEmailChange: (newEmail: string) => Promise<boolean>
  confirmEmailChange: (token: string, password: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>((pb.authStore.record as unknown as User) || null)
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [loading, setLoading] = useState<boolean>(true)

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      if (!pb.authStore.isValid || !pb.authStore.record?.id) {
        setUser(null)
        setToken(null)
        return null
      }
      const record = await pb.collection('users').getOne<User>(pb.authStore.record.id)
      setUser(record)
      setToken(pb.authStore.token)
      return record
    } catch {
      pb.authStore.clear()
      setUser(null)
      setToken(null)
      return null
    }
  }, [])

  useEffect(() => {
    const unsub = pb.authStore.onChange((newToken, model) => {
      setToken(newToken)
      setUser((model as unknown as User) || null)
    })

    if (pb.authStore.isValid) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }

    return () => {
      unsub()
    }
  }, [refreshUser])

  const login = async (email: string, password: string): Promise<User> => {
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)
    const u = authData.record as unknown as User
    setUser(u)
    setToken(authData.token)
    return u
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      return true
    } catch {
      return false
    }
  }

  const confirmPasswordReset = async (
    token: string,
    password: string,
    passwordConfirm: string,
  ): Promise<boolean> => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      logout()
      return true
    } catch {
      return false
    }
  }

  const requestVerification = async (email: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestVerification(email.trim())
      return true
    } catch {
      return false
    }
  }

  const confirmVerification = async (token: string): Promise<boolean> => {
    try {
      await pb.collection('users').confirmVerification(token)
      return true
    } catch {
      return false
    }
  }

  const requestEmailChange = async (newEmail: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestEmailChange(newEmail.trim())
      return true
    } catch {
      return false
    }
  }

  const confirmEmailChange = async (token: string, password: string): Promise<boolean> => {
    try {
      await pb.collection('users').confirmEmailChange(token, password)
      logout()
      return true
    } catch {
      return false
    }
  }

  const isAdmin = user?.role === 'Administrador' || user?.role === 'Administrador Geral'
  const isDoctor = user?.role === 'Médico' || !user?.role
  const isSecretary = user?.role === 'Secretaria'
  const isManager = user?.role === 'Gestor'
  const isAccounting = user?.role === 'Contabilidade'
  const isOperator = user?.role === 'Operador'

  const operatorAllowedClinics: string[] = React.useMemo(() => {
    if (!isOperator || !user?.allowed_clinics) return []
    if (Array.isArray(user.allowed_clinics)) return user.allowed_clinics
    try {
      const parsed = JSON.parse(user.allowed_clinics)
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* ignore */
    }
    return []
  }, [isOperator, user?.allowed_clinics])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isDoctor,
        isSecretary,
        isManager,
        isAccounting,
        isOperator,
        operatorAllowedClinics,
        login,
        logout,
        refreshUser,
        requestPasswordReset,
        confirmPasswordReset,
        requestVerification,
        confirmVerification,
        requestEmailChange,
        confirmEmailChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
