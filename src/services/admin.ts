import pb from '@/lib/pocketbase/client'
import type { Invitation, User, UserPermissions, UserRole } from '@/types'

export const adminService = {
  // Invitations
  async getInvitations(): Promise<Invitation[]> {
    return pb.collection('invitations').getFullList<Invitation>({
      sort: '-created',
    })
  },

  async createInvitation(data: {
    email: string
    name: string
    role: UserRole
    assigned_doctor?: string
    allowed_clinics?: string[]
  }): Promise<Invitation> {
    const randomBytes = new Uint8Array(24)
    crypto.getRandomValues(randomBytes)
    const token = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')
    // 7 days expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return pb.collection('invitations').create<Invitation>({
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      role: data.role,
      token,
      status: 'Pendente',
      expires_at: expiresAt.toISOString(),
      created_by: pb.authStore.record?.id,
      assigned_doctor: data.assigned_doctor || undefined,
      allowed_clinics: data.allowed_clinics || undefined,
    })
  },

  async resendInvitation(id: string): Promise<Invitation> {
    const randomBytes = new Uint8Array(24)
    crypto.getRandomValues(randomBytes)
    const token = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return pb.collection('invitations').update<Invitation>(id, {
      token,
      status: 'Pendente',
      expires_at: expiresAt.toISOString(),
    })
  },

  async cancelInvitation(id: string): Promise<boolean> {
    return pb.collection('invitations').delete(id)
  },

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      const records = await pb.collection('invitations').getFullList<Invitation>({
        filter: `token = '${token}'`,
      })
      if (records.length === 0) return null
      const inv = records[0]
      // Check expiration
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        if (inv.status === 'Pendente') {
          await pb
            .collection('invitations')
            .update(inv.id, { status: 'Expirado' })
            .catch(() => {})
        }
        return { ...inv, status: 'Expirado' }
      }
      return inv
    } catch {
      return null
    }
  },

  // Team
  async getTeam(): Promise<User[]> {
    return pb.collection('users').getFullList<User>({
      sort: 'name',
    })
  },

  async toggleUserActive(userId: string, currentStatus: boolean): Promise<User> {
    return pb.collection('users').update<User>(userId, {
      active: !currentStatus,
    })
  },

  async deleteUser(userId: string): Promise<boolean> {
    return pb.collection('users').delete(userId)
  },

  // User permissions
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      const records = await pb.collection('user_permissions').getFullList<UserPermissions>({
        filter: `user = '${userId}'`,
      })
      return records[0] || null
    } catch {
      return null
    }
  },

  async saveUserPermissions(
    userId: string,
    permissions: Partial<UserPermissions>,
  ): Promise<UserPermissions> {
    const existing = await this.getUserPermissions(userId)
    if (existing) {
      return pb.collection('user_permissions').update<UserPermissions>(existing.id, permissions)
    } else {
      return pb.collection('user_permissions').create<UserPermissions>({
        ...permissions,
        user: userId,
      })
    }
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    return pb.collection('users').update<User>(userId, { role })
  },
}
