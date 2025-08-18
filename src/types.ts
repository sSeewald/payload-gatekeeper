import type { RelationshipField } from 'payload'

export type RoleFieldPlacement = {
  tab?: string        // Which tab to add to
  position?: 'first' | 'last' | 'sidebar' | number  // Position within tab/fields
}

export interface CollectionPermissionConfig {
  // Should enhance this collection with role field?
  enhance: boolean

  // Where to place the role field
  roleFieldPlacement?: RoleFieldPlacement

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

  // Skip if role field already exists
  skipIfRoleExists?: boolean

  // Collections to exclude from permission checks
  excludeCollections?: string[]

  // Custom permissions
  customPermissions?: Array<{
    label: string
    value: string  // e.g., "event-management.export" - namespace will be extracted and formatted
    description?: string
  }>

  // Skip permission checks (useful for seeding/migration)
  skipPermissionChecks?: boolean | (() => boolean)

  // Force role sync on init (defaults to development only)
  syncRolesOnInit?: boolean

  // System roles to create/sync (in addition to super_admin)
  systemRoles?: SystemRole[]

  // UI group for the Roles collection in admin panel
  rolesGroup?: string

  // Custom slug for the Roles collection (default: 'roles')
  rolesSlug?: string

  /**
   * Disable the public role for non-authenticated users
   * @default false
   */
  disablePublicRole?: boolean

  /**
   * Custom permissions for public (non-authenticated) users
   * @default ['*.read'] - read access to all non-auth collections
   * @example ['pages.read', 'posts.read', 'media.read', 'comments.create']
   */
  publicRolePermissions?: string[]
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
