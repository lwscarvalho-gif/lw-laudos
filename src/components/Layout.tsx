import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Layers,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { path: '/painel', label: 'Painel', icon: LayoutDashboard },
  { path: '/pacientes', label: 'Pacientes', icon: Users },
  { path: '/exames', label: 'Exames', icon: ClipboardList },
  { path: '/laudos', label: 'Laudos', icon: FileText },
  { path: '/modelos', label: 'Modelos', icon: Layers },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/painel')) return 'Painel'
    if (path.startsWith('/pacientes')) return 'Pacientes'
    if (path.startsWith('/exames')) return 'Exames'
    if (path.startsWith('/laudos')) return 'Laudos'
    if (path.startsWith('/modelos')) return 'Modelos'
    if (path.startsWith('/configuracoes')) return 'Configurações'
    if (path.startsWith('/administracao')) return 'Administração'
    return 'Sistema Médico'
  }

  const userInitials = (user?.name || user?.email || 'M')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  return (
    <div className="min-h-screen flex bg-[#F7F9F8] text-[#1F2A27]">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden lg:flex lg:flex-col w-[260px] bg-white border-r border-[#E5E9E7] fixed inset-y-0 left-0 z-30">
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-[#E5E9E7] gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0C6B58] flex items-center justify-center text-white shadow-sm font-bold text-lg">
            ⚕
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-[#1F2A27]">Sistema Médico</span>
            <span className="text-[11px] text-[#5F6E69] font-medium tracking-wide uppercase">
              Multiperfil
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold text-[#8A9691] uppercase tracking-wider mb-2">
            Menu Principal
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                    : 'text-[#5F6E69] hover:bg-[#F7F9F8] hover:text-[#1F2A27]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0C6B58]' : 'text-[#8A9691]'}`} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          {/* Admin section */}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-[#E5E9E7] space-y-1">
              <p className="px-3 text-[11px] font-semibold text-[#8A9691] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#0C6B58]" />
                Administração
              </p>
              <NavLink
                to="/administracao?tab=convites"
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === '/administracao' && location.search.includes('convites')
                    ? 'bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                    : 'text-[#5F6E69] hover:bg-[#F7F9F8] hover:text-[#1F2A27]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-[#8A9691]" />
                  <span>Convites</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8A9691]" />
              </NavLink>
              <NavLink
                to="/administracao?tab=equipe"
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === '/administracao' &&
                  (location.search.includes('equipe') || !location.search)
                    ? 'bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                    : 'text-[#5F6E69] hover:bg-[#F7F9F8] hover:text-[#1F2A27]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-[#8A9691]" />
                  <span>Equipe</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8A9691]" />
              </NavLink>
            </div>
          )}
        </div>

        {/* Sidebar Footer with user badge */}
        <div className="p-3 border-t border-[#E5E9E7] bg-white">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F7F9F8]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#0C6B58] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {userInitials}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-[#1F2A27] truncate">
                  {user?.professional_name || user?.name || 'Médico'}
                </span>
                <span className="text-[10px] text-[#5F6E69] truncate">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 text-[#8A9691] hover:text-[#DC2626] hover:bg-white rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[270px] bg-white shadow-xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#E5E9E7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0C6B58] text-white flex items-center justify-center font-bold">
                  ⚕
                </div>
                <span className="font-bold text-sm text-[#1F2A27]">Sistema Médico</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-md text-[#5F6E69] hover:bg-[#F7F9F8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#E8F3F0] text-[#0C6B58] font-semibold'
                        : 'text-[#5F6E69] hover:bg-[#F7F9F8] hover:text-[#1F2A27]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0C6B58]' : 'text-[#8A9691]'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-[#E5E9E7] space-y-1">
                  <p className="px-3 text-[11px] font-semibold text-[#8A9691] uppercase tracking-wider mb-2">
                    Administração
                  </p>
                  <NavLink
                    to="/administracao?tab=convites"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#5F6E69] hover:bg-[#F7F9F8]"
                  >
                    <Shield className="w-4 h-4 text-[#8A9691]" />
                    <span>Convites</span>
                  </NavLink>
                  <NavLink
                    to="/administracao?tab=equipe"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#5F6E69] hover:bg-[#F7F9F8]"
                  >
                    <UserCheck className="w-4 h-4 text-[#8A9691]" />
                    <span>Equipe</span>
                  </NavLink>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E5E9E7]">
              <Button
                variant="outline"
                className="w-full justify-start text-[#DC2626] hover:bg-red-50 hover:text-[#DC2626] border-[#E5E9E7]"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da conta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:pl-[260px] min-w-0">
        {/* Topbar (64px) */}
        <header className="h-16 bg-white border-b border-[#E5E9E7] sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#5F6E69] hover:bg-[#F7F9F8]"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-[#1F2A27]">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              type="button"
              className="relative p-2 text-[#5F6E69] hover:text-[#1F2A27] hover:bg-[#F7F9F8] rounded-full transition"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full" />
            </button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 focus:outline-none">
                  <div className="w-9 h-9 rounded-full bg-[#0C6B58] text-white flex items-center justify-center font-semibold text-xs shadow-sm hover:ring-2 hover:ring-[#0C6B58]/30 transition">
                    {userInitials}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-[#E5E9E7]">
                <DropdownMenuLabel>
                  <p className="font-semibold text-sm text-[#1F2A27] truncate">
                    {user?.professional_name || user?.name || 'Médico'}
                  </p>
                  <p className="text-xs text-[#5F6E69] font-normal truncate">{user?.email}</p>
                  {user?.crm && (
                    <p className="text-[11px] text-[#0C6B58] font-medium mt-0.5">
                      CRM {user.crm_uf ? `${user.crm_uf} ` : ''}
                      {user.crm}
                    </p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/configuracoes')}
                  className="cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate('/administracao')}
                    className="cursor-pointer"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Administração
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-[#DC2626] focus:text-[#DC2626] focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in-up">
          <Outlet />
        </main>

        {/* Slim Footer */}
        <footer className="py-4 px-6 border-t border-[#E5E9E7] text-center text-xs text-[#8A9691] bg-white">
          Sistema Médico Multiperfil © 2025
        </footer>
      </div>
    </div>
  )
}
