import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  FileText,
  Layers,
  ArrowRight,
  UserCheck,
  Shield,
  Loader2,
  Calendar,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { patientsService } from '@/services/patients'
import { examsService } from '@/services/exams'
import { reportsService } from '@/services/reports'
import { templatesService } from '@/services/templates'
import { adminService } from '@/services/admin'
import { useRealtime } from '@/hooks/use-realtime'
import type { Report, User } from '@/types'
import { formatDateBR, formatRelativeDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { DigitalSignatureCard } from '@/components/DigitalSignatureCard'

export default function Painel() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [patientCount, setPatientCount] = useState(0)
  const [examCount, setExamCount] = useState(0)
  const [reportCount, setReportCount] = useState(0)
  const [templateCount, setTemplateCount] = useState(0)

  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const firstName = (user?.name || user?.professional_name || 'Doutor(a)')
    .replace(/^Dr(a)?\.\s*/i, '')
    .split(' ')[0]

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [pts, exs, reps, myTpls, recent] = await Promise.all([
        patientsService.getList(1, 1),
        examsService.getList(1, 1),
        reportsService.getList(1, 1),
        templatesService.getMyTemplates(),
        reportsService.getRecent(5),
      ])

      setPatientCount(pts.totalItems)
      setExamCount(exs.totalItems)
      setReportCount(reps.totalItems)
      setTemplateCount(myTpls.length)
      setRecentReports(recent)

      if (isAdmin) {
        const team = await adminService.getTeam()
        setTeamMembers(team)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  useRealtime('patients', () => loadDashboardData())
  useRealtime('exams', () => loadDashboardData())
  useRealtime('reports', () => loadDashboardData())
  useRealtime('templates', () => loadDashboardData())

  const statCards = [
    {
      title: 'Pacientes',
      count: patientCount,
      path: '/pacientes',
      icon: Users,
      bgColor: 'bg-blue-50/80',
      textColor: 'text-blue-700',
      accentColor: 'bg-blue-500',
    },
    {
      title: 'Exames',
      count: examCount,
      path: '/exames',
      icon: ClipboardList,
      bgColor: 'bg-emerald-50/80',
      textColor: 'text-emerald-700',
      accentColor: 'bg-emerald-500',
    },
    {
      title: 'Laudos',
      count: reportCount,
      path: '/laudos',
      icon: FileText,
      bgColor: 'bg-purple-50/80',
      textColor: 'text-purple-700',
      accentColor: 'bg-purple-500',
    },
    {
      title: 'Modelos',
      count: templateCount,
      path: '/modelos',
      icon: Layers,
      bgColor: 'bg-amber-50/80',
      textColor: 'text-amber-700',
      accentColor: 'bg-amber-500',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Greeting Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2A27]">Olá, {firstName} 👋</h1>
        <p className="text-sm text-[#5F6E69] mt-1 capitalize">{todayFormatted}</p>
      </div>

      {/* Switch Assinatura Digital (médico / administrador) */}
      {(user?.role === 'Médico' ||
        user?.role === 'Administrador' ||
        user?.role === 'Administrador Geral' ||
        !user?.role) && <DigitalSignatureCard />}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all flex flex-col justify-between"
            >
              {/* Colored top strip */}
              <div className={`h-1.5 w-full ${card.accentColor}`} />

              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#5F6E69] uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-[#1F2A27] mt-1">
                    {loading ? '—' : card.count}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl ${card.bgColor} ${card.textColor} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="px-5 py-2.5 bg-[#F7F9F8] border-t border-[#E5E9E7] text-xs font-medium text-[#5F6E69] flex items-center justify-between">
                <span>Ver todos os registros</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8A9691]" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E5E9E7] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-[#1F2A27]">Atividade Recente</h2>
            <p className="text-xs text-[#5F6E69]">Últimos laudos emitidos em seu perfil</p>
          </div>
          <Link
            to="/laudos"
            className="text-xs font-semibold text-[#0C6B58] hover:underline flex items-center gap-1"
          >
            Ver todos
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#0C6B58] animate-spin" />
            <p className="text-xs text-[#5F6E69]">Carregando atividade...</p>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8A9691]">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum laudo criado ainda.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E9E7]">
            {recentReports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => navigate(`/laudos/${rep.id}`)}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-[#F7F9F8] cursor-pointer transition"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-[#1F2A27]">{rep.title}</p>
                  <p className="text-xs text-[#5F6E69]">
                    Paciente: {rep.expand?.patient_id?.name || 'Não identificado'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#8A9691] font-medium">
                    {formatRelativeDate(rep.signature_date || rep.created)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Only: Visão da Equipe */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-[#E5E9E7] shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-[#E5E9E7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0C6B58]" />
                <h2 className="font-bold text-base text-[#1F2A27]">
                  Visão da Equipe (Administração)
                </h2>
              </div>
              <p className="text-xs text-[#5F6E69] mt-0.5">
                Visão restrita de gestão de contas e acessos de médicos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/administracao?tab=convites')}
                className="text-xs border-[#E5E9E7]"
              >
                Convidar Médico
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/administracao?tab=equipe')}
                className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs"
              >
                Gerenciar Equipe
              </Button>
            </div>
          </div>

          <div className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E9E7] text-[#8A9691] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Médico</th>
                    <th className="py-2.5 px-3">CRM</th>
                    <th className="py-2.5 px-3">Papel</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E7]">
                  {teamMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F7F9F8]/60">
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#1F2A27] block">
                          {m.professional_name || m.name}
                        </span>
                        <span className="text-[11px] text-[#5F6E69]">{m.email}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#5F6E69]">
                        {m.crm ? `${m.crm_uf ? `${m.crm_uf} ` : ''}${m.crm}` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.role === 'Administrador'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                        >
                          {m.role || 'Médico'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.active !== false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {m.active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/administracao?tab=equipe')}
                          className="h-7 text-xs text-[#0C6B58] hover:bg-[#E8F3F0]"
                        >
                          Gerenciar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
