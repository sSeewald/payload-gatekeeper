import type { RelationshipField } from 'payload'

export interface CollectionPermissionConfig {
  // Should enhance this collection with role field?
  enhance: boolean

  // Where to place the role field
  roleFieldPlacement?: {
    tab?: string        // Which tab to add to
    position?: 'first' | 'last' | 'sidebar' | number  // Position within tab/fields
  }

  // Should the first user in this collection get super admin?
  autoAssignFirstUser?: boolean

  // Default role for new users (by name, e.g., 'user')
  defaultRole?: string

  // Custom role field configuration
  roleFieldConfig?: Partial<RelationshipField>
}

// Main plugin options type
export interface GatekeeperOptions {
  // Per-collection configuration
  collections?: {
    [collectionSlug: string]: CollectionPermissionConfig
  }

  // Default config for auth collections not explicitly configured
  defaultConfig?: Partial<CollectionPermissionConfig>

  // Legacy: Should the plugin enhance the admin user collection?
  enhanceAdminUser?: boolean

  // Legacy: Should the plugin enhance ALL auth-enabled collections with role field?
  enhanceAllAuthCollections?: boolean

  // Legacy: Where to place the role field in admin user collection
  roleFieldPlacement?: {
    tab?: string        // Which tab to add to
    position?: 'first' | 'last' | 'sidebar' | number  // Position within tab/fields
  }

  // Skip if role field already exists
  skipIfRoleExists?: boolean

  // Collections to exclude from permission checks
  excludeCollections?: string[]

  // Enable audit logging
  enableAuditLog?: boolean

  // Custom permissions
  customPermissions?: Array<{
    label: string
    value: string  // e.g., "event-management.export" - namespace will be extracted and formatted
    description?: string
  }>

  // Super admin configuration
  superAdmin?: {
    permission?: string // Default: '*'
  }

  // Skip permission checks (useful for seeding/migration)
  skipPermissionChecks?: boolean | (() => boolean)

  // Enable seeding mode - temporarily disables permission checks
  seedingMode?: boolean

  // Force role sync on init (defaults to development only)
  syncRolesOnInit?: boolean

  // System roles to create/sync (in addition to super_admin)
  systemRoles?: SystemRole[]

  // UI group for the Roles collection in admin panel
  rolesGroup?: string

  // Custom slug for the Roles collection (default: 'roles')
  rolesSlug?: string
}

export interface Permission {
  label: string
  value: string
  category?: string
  description?: string
}

export interface RoleDocument {
  id: string
  name: string
  label: string
  permissions: string[]
  active: boolean
  protected?: boolean
  description?: string
  visibleFor?: string[]
  configHash?: string
  configVersion?: number
  systemManaged?: boolean
}

// Type for system role definitions (used in plugin config and sync)
export interface SystemRole {
  name: string
  label: string
  permissions: string[]
  protected?: boolean
  active?: boolean
  description?: string
  visibleFor?: string[]
}

// Results from role synchronization
export interface SyncResults {
  created: string[]
  updated: string[]
  failed: Array<{ role: string; error: string }>
  skipped: string[]
}
