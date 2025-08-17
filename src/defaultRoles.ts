import type { SystemRole } from './types'

/**
 * Essential system role - always created by the plugin
 * This is the only hardcoded role as it's required for the system to function
 */
export const SUPER_ADMIN_ROLE: SystemRole = {
  name: 'super_admin',
  label: 'Super Administrator',
  permissions: ['*'],
  protected: true,
  active: true,
  description: 'Full system access - automatically assigned to first user',
}

/**
 * Example role configurations that can be used in the plugin config
 * These are NOT automatically created - they must be explicitly configured
 */
export const EXAMPLE_ROLES = {
  admin: {
    name: 'admin',
    label: 'Administrator',
    permissions: [
      // Backend users management (no role management)
      'backend-users.read',
      'backend-users.create',
      'backend-users.update',
      'backend-users.delete',
      // Frontend users management
      'users.read',
      'users.create',
      'users.update',
      'users.delete',
      // Media management
      'media.read',
      'media.create',
      'media.update',
      'media.delete',
      // System operations (limited)
      'system.export',
      'analytics.read',
      'logs.read',
    ],
    protected: false,
    active: true,
    description: 'Admin access without role management capabilities',
  },
  editor: {
    name: 'editor',
    label: 'Editor',
    permissions: [
      // Read-only for users
      'backend-users.read',
      'users.read',
      // Full media access
      'media.read',
      'media.create',
      'media.update',
      'media.delete',
      // Limited analytics
      'analytics.read',
    ],
    protected: false,
    active: true,
    description: 'Content editor with limited user access',
  },
  user: {
    name: 'user',
    label: 'Frontend User',
    permissions: [
      // Users can only manage their own profile (enforced at row level)
      'users.read',
      'users.update',
      // Media for profile pictures
      'media.create',
      'media.read',
    ],
    protected: false,
    active: true,
    description: 'Default role for frontend users - can manage own profile',
  },
}
