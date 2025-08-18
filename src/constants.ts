export const PERMISSIONS = {
  // Wildcard permissions
  ALL: '*',                    // Super Admin - can do everything
  ALL_READ: '*.read',          // All read permissions
  ALL_CREATE: '*.create',      // All create permissions
  ALL_UPDATE: '*.update',      // All update permissions
  ALL_DELETE: '*.delete',      // All delete permissions
} as const

export const DEFAULT_SUPER_ADMIN_ROLE = {
  name: 'super_admin',
  label: 'Super Administrator',
  permissions: [PERMISSIONS.ALL],
  active: true,
  protected: true, // Cannot be deleted
  description: 'Full system access - automatically assigned to first user',
}

export const CRUD_OPERATIONS = ['create', 'read', 'update', 'delete'] as const
export const EXTENDED_OPERATIONS = ['manage', 'publish', 'archive'] as const
