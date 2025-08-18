import type { CollectionConfig, Field, RelationshipField, TabsField, PayloadRequest } from 'payload'
import type { GatekeeperOptions, RoleFieldPlacement } from '../types'
import { getRolesSlug } from './getRolesSlug'
import { createAfterLoginHook } from '../hooks'
import { createAfterReadHook } from '../hooks'

// Options specifically for enhancement
interface EnhanceOptions extends GatekeeperOptions {
  roleFieldPlacement?: RoleFieldPlacement
  roleFieldConfig?: Partial<RelationshipField>
}

// Helper functions to reduce code duplication
const shouldSkipPermissionCheck = (
  options: GatekeeperOptions,
  req: PayloadRequest
): boolean => {
  // Skip for system operations
  if (req?.context?.isSystemUpdate) {
    return true
  }

  // Skip permission checks if configured
  return (
    (typeof options.skipPermissionChecks === 'function'
      ? options.skipPermissionChecks()
      : options.skipPermissionChecks) || false
  )
}

const isReadOperation = (operation?: string): boolean => {
  return !operation || operation === 'read'
}

const isRoleFieldUnchanged = (operation?: string, data?: Record<string, unknown>): boolean => {
  return Boolean(operation === 'update' && data && !('role' in data))
}

const getUserPermissions = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any,
  req: PayloadRequest
): Promise<string[]> => {
  if (!user?.role) {
    return []
  }

  const userRole = typeof user.role === 'object'
    ? user.role
    : await req.payload.findByID({
        collection: getRolesSlug() as 'roles',
        id: user.role,
      })

  return userRole?.permissions || []
}

const addFieldAtPosition = (
  fields: Field[],
  field: Field,
  position?: 'first' | 'last' | 'sidebar' | number
): void => {
  if (fields.find((f) => 'name' in f && f.name === (field as RelationshipField).name)) {
    return // Field already exists
  }

  if (position === 'last') {
    fields.push(field)
  } else if (typeof position === 'number') {
    fields.splice(position, 0, field)
  } else {
    // Default to first
    fields.unshift(field)
  }
}

/**
 * Enhance auth-enabled collections with role field
 */
export const enhanceCollectionWithRole = (
  collection: CollectionConfig,
  options: EnhanceOptions = {}
): CollectionConfig => {
  // Check if we should skip
  if (options.skipIfRoleExists && hasRoleField(collection.fields)) {
    return collection
  }

  // Determine admin position
  const placement = options.roleFieldPlacement || {}
  const adminPosition = placement.position === 'sidebar' ? { position: 'sidebar' as const } : undefined

  // Create the role field with collection slug passed to filter options
  const roleField: RelationshipField = {
    name: 'role',
    type: 'relationship',
    relationTo: getRolesSlug() as 'roles',
    hasMany: false,
    required: false,
    validate: createRoleValidation(options),
    filterOptions: createRoleFilterOptions(options, collection.slug),
    defaultValue: createRoleDefaultValue(collection.slug),
    admin: {
      description: 'Assigns permissions and access rights to this user',
      ...(adminPosition || {}),
    },
  }

  // Create a shallow copy of the collection to avoid mutations
  const enhancedCollection = {
    ...collection,
    fields: [...(collection.fields || [])]
  }

  // Add the role field based on structure
  const fields = enhancedCollection.fields

  // If position is sidebar, just add to fields with admin.position: 'sidebar'
  if (placement.position === 'sidebar') {
    addFieldAtPosition(fields, roleField, 'first')
    enhancedCollection.fields = fields
    return enhancedCollection
  }

  // Check if collection uses tabs
  const tabsFieldIndex = fields.findIndex((f) => 'type' in f && f.type === 'tabs')

  if (tabsFieldIndex !== -1 && placement.tab) {
    // User explicitly wants to place in a tab
    // Deep clone only the tabs field structure (but not functions)
    const originalTabsField = fields[tabsFieldIndex] as TabsField
    const tabsField: TabsField = {
      ...originalTabsField,
      tabs: originalTabsField.tabs.map((tab) => ({
        ...tab,
        fields: [...tab.fields]
      }))
    }
    fields[tabsFieldIndex] = tabsField

    // Find or create the target tab
    const targetTabName = placement.tab
    let targetTab = tabsField.tabs.find((t) => t.label === targetTabName)

    if (!targetTab) {
      // Create new tab with the specified name
      targetTab = {
        label: targetTabName,
        fields: []
      }
      tabsField.tabs.push(targetTab)
    }

    // Add role field to the tab
    addFieldAtPosition(targetTab.fields, roleField, placement.position)
  } else {
    // No specific tab placement requested, or no tabs exist
    // Add directly to main fields
    addFieldAtPosition(fields, roleField, placement.position)
  }

  enhancedCollection.fields = fields

  // Add afterRead hook to populate role whenever user is loaded
  // This ensures the role is always the full object when the user is fetched
  const existingAfterRead = enhancedCollection.hooks?.afterRead || []
  const afterReadHooks = Array.isArray(existingAfterRead) ? existingAfterRead : [existingAfterRead]

  // Add afterLogin hook to populate role on login response
  // This ensures the role is available as full object immediately after login
  const existingAfterLogin = enhancedCollection.hooks?.afterLogin || []
  const afterLoginHooks = Array.isArray(existingAfterLogin) ? existingAfterLogin : [existingAfterLogin]

  enhancedCollection.hooks = {
    ...enhancedCollection.hooks,
    afterRead: [
      createAfterReadHook(),  // Our hook first to populate role
      ...afterReadHooks,      // Then existing hooks
    ],
    afterLogin: [
      createAfterLoginHook(), // Our hook first to populate role
      ...afterLoginHooks,     // Then existing hooks
    ]
  }

  return enhancedCollection
}

// Create validation function for role field
const createRoleValidation = (options: GatekeeperOptions) => {
  return async (value: unknown, { req, operation, data }: Parameters<NonNullable<RelationshipField['validate']>>[1]) => {
    // Early returns for cases where validation should be skipped
    if (shouldSkipPermissionCheck(options, req)) {
      return true
    }

    if (isReadOperation(operation)) {
      return true
    }

    if (isRoleFieldUnchanged(operation, data)) {
      return true
    }

    // No role is fine
    if (!value) {
      return true
    }

    try {
      const targetRole = await req.payload.findByID({
        collection: getRolesSlug() as 'roles',
        id: String(value),
      })

      if (!targetRole) {
        return 'Role not found'
      }

      // Get user's permissions
      const user = req?.user
      if (!user) {
        // During initial user creation there might be no user
        return true
      }

      const userPermissions = await getUserPermissions(user, req)

      // Import and use canAssignRole
      const { canAssignRole } = await import('./checkPermission')
      // Cast targetRole to the type expected by canAssignRole
      const roleForCheck = targetRole as { protected?: boolean; permissions?: string[]; active?: boolean }
      if (!canAssignRole(userPermissions, roleForCheck)) {
        return `You don't have permission to assign the ${targetRole.label || targetRole.name} role`
      }

      return true
    } catch (error) {
      console.error('Role validation error:', error)
      return 'Error validating role assignment'
    }
  }
}

// Create filter options function for role field
const createRoleFilterOptions = (options: GatekeeperOptions, collectionSlug: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (filterOptions: any) => {
    const { user, req } = filterOptions
    // Early returns for cases where filtering should be skipped
    if (shouldSkipPermissionCheck(options, req)) {
      return true
    }

    // Only show roles that the current user can assign
    if (!user || !('role' in user) || !user.role) {
      // Special case: if user has no role but is logged in (shouldn't happen but safety check)
      return false
    }

    try {
      // Return a where clause to filter roles based on visibleFor
      // Only show roles that explicitly include this collection in visibleFor
      return {
        visibleFor: {
          contains: collectionSlug
        }
      }
    } catch (error) {
      console.error('Error filtering roles:', error)
      return false
    }
  }
}

// Create default value function that auto-selects role if only one is available
const createRoleDefaultValue = (collectionSlug: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ req }: any) => {
    // Skip if no request context (e.g., during build)
    if (!req?.payload) {
      return undefined
    }

    try {
      // Find roles that are visible for this collection and active
      const roles = await req.payload.find({
        collection: getRolesSlug() as 'roles',
        where: {
          visibleFor: {
            contains: collectionSlug
          },
          active: {
            equals: true
          }
        },
        limit: 2, // We only need to know if there's exactly 1
      })

      // If exactly one role is available, auto-select it
      if (roles.docs.length === 1) {
        return roles.docs[0].id
      }

      return undefined
    } catch (error) {
      // Don't fail the form, just don't set a default
      console.warn('Could not determine default role:', error)
      return undefined
    }
  }
}

// Legacy export for backward compatibility
export const enhanceAdminCollection = enhanceCollectionWithRole

/**
 * Check if collection already has a role field
 */
const hasRoleField = (fields: Field[]): boolean => {
  return findFieldRecursive(fields, 'role') !== null
}

/**
 * Recursively search for a field by name
 */
const findFieldRecursive = (fields: Field[], name: string): Field | null => {
  for (const field of fields) {
    if ('name' in field && field.name === name) {
      return field
    }

    // Check in tabs
    if ('tabs' in field && field.tabs) {
      for (const tab of field.tabs) {
        const found = findFieldRecursive(tab.fields || [], name)
        if (found) return found
      }
    }

    // Check in groups
    if ('fields' in field && field.fields) {
      const found = findFieldRecursive(field.fields, name)
      if (found) return found
    }
  }

  return null
}
