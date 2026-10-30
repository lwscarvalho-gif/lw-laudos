import pb from '@/lib/pocketbase/client'
import type { TextMask } from '@/types'

export interface CreateTextMaskInput {
  name: string
  description?: string
  exam_type?: string
  body: string
}

export interface UpdateTextMaskInput {
  name?: string
  description?: string
  exam_type?: string
  body?: string
}

export const textMasksService = {
  /**
   * Retorna todas as máscaras visíveis para o usuário autenticado:
   * máscaras do sistema (is_system = true) + máscaras pessoais do médico (owner_id = auth.id).
   * Ordena por is_system (sistema primeiro ou pessoais primeiro com flag) e nome.
   */
  async getAll(): Promise<TextMask[]> {
    return pb.collection('text_masks').getFullList<TextMask>({
      sort: '-is_system,name',
    })
  },

  /**
   * Retorna máscara específica por id
   */
  async getById(id: string): Promise<TextMask> {
    return pb.collection('text_masks').getOne<TextMask>(id)
  },

  /**
   * Cria uma nova máscara PESSOAL para o médico autenticado
   */
  async create(data: CreateTextMaskInput): Promise<TextMask> {
    const owner_id = pb.authStore.record?.id
    if (!owner_id) throw new Error('Usuário não autenticado.')

    return pb.collection('text_masks').create<TextMask>({
      ...data,
      owner_id,
      is_system: false,
    })
  },

  /**
   * Atualiza máscara pessoal existente (nome, descrição, body)
   */
  async update(id: string, data: UpdateTextMaskInput): Promise<TextMask> {
    return pb.collection('text_masks').update<TextMask>(id, data)
  },

  /**
   * Exclui uma máscara pessoal
   */
  async delete(id: string): Promise<boolean> {
    return pb.collection('text_masks').delete(id)
  },
}
