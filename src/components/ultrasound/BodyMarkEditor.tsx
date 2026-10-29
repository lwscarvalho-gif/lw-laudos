import React, { useState, useRef, useMemo } from 'react'
import type { BodyMarkPoint, BodyMarkSchemeId, BodyMarksState } from '@/types'
import {
  ANATOMICAL_SCHEMES,
  TENDON_OPTIONS,
  LESION_GRADE_OPTIONS,
  QUADRANT_OPTIONS,
  DEVICE_STATUS_OPTIONS,
} from '@/lib/bodyMarks/schemes'
import { buildBodyMarkSvgString } from '@/lib/bodyMarks/svgRenderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit2, Crosshair, MapPin, Clock, Sparkles, Layers, Info } from 'lucide-react'

interface BodyMarkEditorProps {
  value?: BodyMarksState | null
  onChange: (value: BodyMarksState) => void
  disabled?: boolean
}

export default function BodyMarkEditor({ value, onChange, disabled = false }: BodyMarkEditorProps) {
  const schemeId: BodyMarkSchemeId = value?.schemeId || 'none'
  const points: BodyMarkPoint[] = useMemo(() => value?.points || [], [value?.points])

  const [activePointId, setActivePointId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPointId, setEditingPointId] = useState<string | null>(null)

  // Form states for creating / editing a mark
  const [tempCoords, setTempCoords] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const [side, setSide] = useState<BodyMarkPoint['side']>('Não se aplica')
  const [quadrant, setQuadrant] = useState<BodyMarkPoint['quadrant']>('Não se aplica')
  const [clockHour, setClockHour] = useState<string>('')
  const [distanceFromNippleCm, setDistanceFromNippleCm] = useState<string>('')
  const [deviceStatus, setDeviceStatus] = useState<BodyMarkPoint['deviceStatus']>('Não se aplica')
  const [tendon, setTendon] = useState<BodyMarkPoint['tendon']>('Não se aplica')
  const [lesionGrade, setLesionGrade] = useState<BodyMarkPoint['lesionGrade']>('Não se aplica')
  const [description, setDescription] = useState<string>('')

  const svgContainerRef = useRef<HTMLDivElement>(null)

  const activeSchemeDef = schemeId !== 'none' ? ANATOMICAL_SCHEMES[schemeId] : null

  // Switch anatomical scheme
  const handleSchemeChange = (newSchemeId: BodyMarkSchemeId) => {
    if (newSchemeId === schemeId) return
    const schemeDef = newSchemeId !== 'none' ? ANATOMICAL_SCHEMES[newSchemeId] : null
    onChange({
      schemeId: newSchemeId,
      points: points.length > 0 && newSchemeId === 'none' ? [] : points,
    })
    setActivePointId(null)
  }

  // Handle clicking on SVG diagram to register or select a mark
  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || schemeId === 'none') return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const normX = Math.max(0.02, Math.min(0.98, clickX / rect.width))
    const normY = Math.max(0.02, Math.min(0.98, clickY / rect.height))

    // Check if clicked close to an existing mark (~24px radius)
    const clickedExisting = points.find((pt) => {
      const ptPxX = pt.x * rect.width
      const ptPxY = pt.y * rect.height
      const dist = Math.hypot(ptPxX - clickX, ptPxY - clickY)
      return dist <= 24
    })

    if (clickedExisting) {
      setActivePointId(clickedExisting.id)
      return
    }

    // New mark request: Open confirmation modal (NO accidental marks)
    openCreateModal(normX, normY)
  }

  const openCreateModal = (normX: number, normY: number) => {
    setEditingPointId(null)
    setTempCoords({ x: normX, y: normY })

    // Auto-calculate suggested defaults for breast quadrants based on geometry
    const isBreast = schemeId === 'mama_direita' || schemeId === 'mama_esquerda'
    const isRightBreast = schemeId === 'mama_direita'

    let defaultSide: BodyMarkPoint['side'] = activeSchemeDef?.defaultSide || 'Não se aplica'
    let defaultQuad: BodyMarkPoint['quadrant'] = 'Não se aplica'
    let defaultHour = ''

    if (isBreast) {
      // In breast SVG: Center is roughly at (300/600, 235/450) => (0.50, 0.52)
      const dx = normX - 0.5
      const dy = normY - 0.52
      const isSuper = dy < 0
      const isViewerLeft = dx < 0

      if (isRightBreast) {
        // MD: Viewer left is LATERAL, Viewer right is MEDIAL
        defaultQuad = isSuper
          ? isViewerLeft
            ? 'Superolateral'
            : 'Superomedial'
          : isViewerLeft
            ? 'Inferolateral'
            : 'Inferomedial'
      } else {
        // ME: Viewer left is MEDIAL, Viewer right is LATERAL
        defaultQuad = isSuper
          ? isViewerLeft
            ? 'Superomedial'
            : 'Superolateral'
          : isViewerLeft
            ? 'Inferomedial'
            : 'Inferolateral'
      }

      // Calculate approximate clock angle
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90
      if (angleDeg < 0) angleDeg += 360
      const calcHour = Math.round(angleDeg / 30) || 12
      defaultHour = String(calcHour === 0 ? 12 : calcHour)
    }

    setSide(defaultSide)
    setQuadrant(defaultQuad)
    setClockHour(defaultHour)
    setDistanceFromNippleCm('')
    setDeviceStatus(schemeId === 'utero_transvaginal' ? 'Mal posicionado' : 'Não se aplica')
    setTendon(schemeId === 'ombro_articular' ? 'Supraespinhal' : 'Não se aplica')
    setLesionGrade('Não se aplica')
    setDescription('')
    setModalOpen(true)
  }

  const openEditModal = (point: BodyMarkPoint) => {
    setEditingPointId(point.id)
    setTempCoords({ x: point.x, y: point.y })
    setSide(point.side || 'Não se aplica')
    setQuadrant(point.quadrant || 'Não se aplica')
    setClockHour(point.clockHour ? String(point.clockHour) : '')
    setDistanceFromNippleCm(point.distanceFromNippleCm || '')
    setDeviceStatus(point.deviceStatus || 'Não se aplica')
    setTendon(point.tendon || 'Não se aplica')
    setLesionGrade(point.lesionGrade || 'Não se aplica')
    setDescription(point.description || '')
    setModalOpen(true)
  }

  const handleSaveModal = () => {
    const parsedHour = clockHour ? parseInt(clockHour, 10) : undefined

    if (editingPointId) {
      // Update existing mark
      const updated = points.map((pt) =>
        pt.id === editingPointId
          ? {
              ...pt,
              side,
              quadrant,
              clockHour: parsedHour && parsedHour >= 1 && parsedHour <= 12 ? parsedHour : undefined,
              distanceFromNippleCm: distanceFromNippleCm.trim() || undefined,
              deviceStatus,
              tendon,
              lesionGrade,
              description: description.trim(),
            }
          : pt,
      )
      onChange({ schemeId, points: updated })
      setActivePointId(editingPointId)
    } else {
      // Create new mark with next sequential number
      const nextNumber = points.length > 0 ? Math.max(...points.map((p) => p.number)) + 1 : 1
      const newPoint: BodyMarkPoint = {
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        number: nextNumber,
        x: tempCoords.x,
        y: tempCoords.y,
        side,
        quadrant,
        clockHour: parsedHour && parsedHour >= 1 && parsedHour <= 12 ? parsedHour : undefined,
        distanceFromNippleCm: distanceFromNippleCm.trim() || undefined,
        deviceStatus,
        tendon,
        lesionGrade,
        description: description.trim(),
      }
      onChange({ schemeId, points: [...points, newPoint] })
      setActivePointId(newPoint.id)
    }

    setModalOpen(false)
  }

  const handleRemovePoint = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const remaining = points.filter((p) => p.id !== id)
    // Renumber sequentially 1..N for consistency in reports and PDF
    const renumbered = remaining.map((p, idx) => ({ ...p, number: idx + 1 }))
    onChange({ schemeId, points: renumbered })
    if (activePointId === id) setActivePointId(null)
  }

  const handleClearAll = () => {
    if (window.confirm('Deseja remover todas as marcas anatômicas deste laudo?')) {
      onChange({ schemeId, points: [] })
      setActivePointId(null)
    }
  }

  // Pre-rendered SVG markup string
  const svgMarkup = useMemo(() => {
    return buildBodyMarkSvgString(schemeId, points, {
      width: 600,
      height: 450,
      activePointId: activePointId || undefined,
      showBackground: true,
    })
  }, [schemeId, points, activePointId])

  return (
    <div className="bg-white rounded-xl border border-[#E5E9E7] p-5 shadow-sm space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E9E7] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8F3F0] flex items-center justify-center text-[#0C6B58]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1F2A27]">Esquema Anatômico / Body Mark</h3>
            <p className="text-xs text-[#5F6E69]">
              Mapeamento visual de lesões, quadrantes, tendões e dispositivos
            </p>
          </div>
        </div>

        {/* Scheme Selector */}
        <div className="flex items-center gap-2">
          <Select
            value={schemeId}
            onValueChange={(val) => handleSchemeChange(val as BodyMarkSchemeId)}
            disabled={disabled}
          >
            <SelectTrigger className="text-xs font-semibold h-8 w-56 border-[#0C6B58] text-[#0C6B58] bg-[#F7FAF9]">
              <SelectValue placeholder="Selecione o esquema..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum esquema (sem body mark)</SelectItem>
              <SelectItem value="mama_direita">Mama Direita (MD)</SelectItem>
              <SelectItem value="mama_esquerda">Mama Esquerda (ME)</SelectItem>
              <SelectItem value="utero_transvaginal">Útero / Transvaginal (DIU)</SelectItem>
              <SelectItem value="ombro_articular">Articulação do Ombro (Tendões)</SelectItem>
              <SelectItem value="tireoide">Tireoide (Lobos e Istmo)</SelectItem>
              <SelectItem value="abdome_fatia">Fatia Abdominal</SelectItem>
            </SelectContent>
          </Select>

          {points.length > 0 && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-[#DC2626] hover:bg-red-50 h-8"
              title="Limpar todas as marcas"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {schemeId === 'none' ? (
        <div className="py-8 text-center text-xs text-[#8A9691] bg-[#FAFBFB] rounded-lg border border-dashed border-[#E5E9E7] space-y-1">
          <Crosshair className="w-6 h-6 mx-auto text-[#8A9691]/70" />
          <p className="font-medium text-[#5F6E69]">Nenhum esquema selecionado</p>
          <p>
            Selecione uma figura anatômica acima para registrar e mapear lesões visualmente no laudo
            e no PDF.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Instruction banner */}
          <div className="flex items-center justify-between text-xs bg-[#E8F3F0] text-[#0C6B58] p-2.5 rounded-lg border border-[#D0E6E1]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                <strong>Como marcar:</strong> Clique no ponto exato do desenho para registrar a
                lesão com confirmação. Clique num ponto numerado existente para editar ou mover.
              </span>
            </div>
            <span className="text-[11px] font-bold shrink-0">
              {points.length} {points.length === 1 ? 'marca registrada' : 'marcas registradas'}
            </span>
          </div>

          {/* Interactive SVG Diagram Canvas */}
          <div className="flex justify-center bg-[#F8FAF9] rounded-xl border border-[#D6DDD9] p-3 overflow-x-auto">
            <div
              ref={svgContainerRef}
              onClick={handleSvgClick}
              className={`relative max-w-full cursor-crosshair transition-all select-none ${
                disabled ? 'pointer-events-none opacity-80' : ''
              }`}
              style={{ width: '600px', height: '450px' }}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>

          {/* List of registered body marks (Legenda Clínica) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#0C6B58] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Legenda de Marcas Anatômicas Registradas ({points.length})
              </h4>
              {points.length > 0 && (
                <span className="text-[11px] text-[#5F6E69]">
                  Inclusas na impressão e no documento final
                </span>
              )}
            </div>

            {points.length === 0 ? (
              <p className="text-xs text-[#8A9691] italic py-2">
                Nenhum ponto registrado ainda. Clique no esquema anatômico acima para adicionar a
                primeira marca.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {points.map((pt) => {
                  const isActive = pt.id === activePointId
                  return (
                    <div
                      key={pt.id}
                      onClick={() => setActivePointId(pt.id)}
                      className={`p-3 rounded-lg border transition text-xs flex items-start justify-between gap-2 cursor-pointer ${
                        isActive
                          ? 'border-[#0C6B58] bg-[#F2F8F6] ring-1 ring-[#0C6B58]/30 shadow-sm'
                          : 'border-[#E5E9E7] bg-white hover:border-[#0C6B58]/50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                          {pt.number}
                        </span>
                        <div className="space-y-0.5 leading-snug">
                          <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[#1F2A27]">
                            {pt.quadrant && pt.quadrant !== 'Não se aplica' && (
                              <span className="bg-emerald-50 text-[#0C6B58] px-1.5 py-0.5 rounded text-[10px] border border-[#0C6B58]/20">
                                {pt.quadrant}
                              </span>
                            )}
                            {pt.clockHour && (
                              <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-[10px] border border-blue-200 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {pt.clockHour}h
                              </span>
                            )}
                            {pt.tendon && pt.tendon !== 'Não se aplica' && (
                              <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded text-[10px] border border-amber-200">
                                Tendão {pt.tendon}
                              </span>
                            )}
                            {pt.lesionGrade && pt.lesionGrade !== 'Não se aplica' && (
                              <span className="bg-red-50 text-[#DC2626] px-1.5 py-0.5 rounded text-[10px] border border-red-200 font-bold">
                                {pt.lesionGrade}
                              </span>
                            )}
                            {pt.deviceStatus && pt.deviceStatus !== 'Não se aplica' && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  pt.deviceStatus === 'Mal posicionado'
                                    ? 'bg-red-100 text-[#DC2626] border-red-300'
                                    : 'bg-emerald-100 text-[#0C6B58] border-emerald-300'
                                }`}
                              >
                                DIU {pt.deviceStatus}
                              </span>
                            )}
                          </div>

                          {pt.distanceFromNippleCm && (
                            <p className="text-[11px] text-[#5F6E69]">
                              Distância à papila: <strong>{pt.distanceFromNippleCm}</strong>
                            </p>
                          )}

                          <p className="text-[#1F2A27] font-medium pt-0.5">
                            {pt.description || 'Sem descrição livre informada'}
                          </p>
                        </div>
                      </div>

                      {!disabled && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(pt)
                            }}
                            className="w-7 h-7 text-[#5F6E69] hover:text-[#0C6B58]"
                            title="Editar marca"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleRemovePoint(pt.id, e)}
                            className="w-7 h-7 text-[#5F6E69] hover:text-[#DC2626]"
                            title="Remover marca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation & Registration Modal for New or Edited Mark */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1F2A27] flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#0C6B58]" />
              {editingPointId ? 'Editar Detalhes da Marca' : 'Registrar Marca Anatômica'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Breast-specific fields */}
            {(schemeId === 'mama_direita' || schemeId === 'mama_esquerda') && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F9F8] rounded-lg border border-[#E5E9E7]">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[#1F2A27]">Quadrante</Label>
                  <Select
                    value={quadrant}
                    onValueChange={(val) => setQuadrant(val as BodyMarkPoint['quadrant'])}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUADRANT_OPTIONS.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-[#1F2A27]">
                    Hora do Relógio (1–12)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={clockHour}
                    onChange={(e) => setClockHour(e.target.value)}
                    placeholder="Ex.: 11"
                    className="text-xs h-8"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-[#1F2A27]">
                    Distância à Papila (opcional)
                  </Label>
                  <Input
                    value={distanceFromNippleCm}
                    onChange={(e) => setDistanceFromNippleCm(e.target.value)}
                    placeholder="Ex.: 2.5 cm da papila, às 11h"
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}

            {/* Uterus / DIU specific fields */}
            {schemeId === 'utero_transvaginal' && (
              <div className="p-3 bg-[#FEF9F6] rounded-lg border border-[#FED7AA] space-y-2">
                <Label className="text-[11px] font-bold text-[#9A3412]">
                  Status do Dispositivo Intrauterino (DIU)
                </Label>
                <Select
                  value={deviceStatus}
                  onValueChange={(val) => setDeviceStatus(val as BodyMarkPoint['deviceStatus'])}
                >
                  <SelectTrigger className="text-xs h-8 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#5F6E69]">
                  Indica a conformação e relação com o endométrio (fundo uterino vs descido/haste no
                  canal).
                </p>
              </div>
            )}

            {/* Shoulder / Rotator cuff specific fields */}
            {schemeId === 'ombro_articular' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F5F3FF] rounded-lg border border-[#DDD6FE]">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#5B21B6]">Tendão Acometido</Label>
                  <Select
                    value={tendon}
                    onValueChange={(val) => setTendon(val as BodyMarkPoint['tendon'])}
                  >
                    <SelectTrigger className="text-xs h-8 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENDON_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#5B21B6]">Grau da Lesão</Label>
                  <Select
                    value={lesionGrade}
                    onValueChange={(val) => setLesionGrade(val as BodyMarkPoint['lesionGrade'])}
                  >
                    <SelectTrigger className="text-xs h-8 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LESION_GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* General Description */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#1F2A27]">
                Descrição Clínica da Lesão / Observações
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Nódulo sólido hipoecogênico de margens circunscritas medindo 12x8mm (BI-RADS 3)"
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[#8A9691] pt-1">
              <Info className="w-3.5 h-3.5" />
              <span>
                As coordenadas normalizadas (x: {tempCoords.x.toFixed(2)}, y:{' '}
                {tempCoords.y.toFixed(2)}) serão salvas no JSON do laudo.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModal}
              className="bg-[#0C6B58] hover:bg-[#0A5949] text-white text-xs font-semibold"
            >
              {editingPointId ? 'Atualizar Marca' : 'Adicionar Marca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
