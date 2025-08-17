export const PERMISSIONS = {
  // Wildcard permissions
  ALL: '*',                    // Super Admin - can do everything
  ALL_READ: '*.read',          // All read permissions
  ALL_CREATE: '*.create',      // All create permissions
  ALL_UPDATE: '*.update',      // All update permissions
  ALL_DELETE: '*.delete',      // All delete permissions
  
  // System permissions
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_EXPORT: 'system.export',
  SYSTEM_IMPORT: 'system.import',
  SYSTEM_CACHE: 'system.cache',
  
  // Analytics
  ANALYTICS_READ: 'analytics.read',
  LOGS_READ: 'logs.read',
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