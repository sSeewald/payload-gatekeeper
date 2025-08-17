import type { CollectionConfig, CollectionBeforeDeleteHook, CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'

import { checkPermission } from '../utils/checkPermission'
import { formatLabel } from '../utils/formatLabel'
import { generateCollectionPermissions } from '../utils/generatePermissions'
import { DEFAULT_SUPER_ADMIN_ROLE } from '../constants'
import { getRolesSlug } from '../utils/getRolesSlug'

import type { GatekeeperOptions } from '../types'

export const createRolesCollection = (
  collections: CollectionConfig[],
  options: GatekeeperOptions = {}
): CollectionConfig => {
  const rolesSlug = options.rolesSlug || 'roles'

  // Create a placeholder for the roles collection itself to include in permission generation
  const rolesPlaceholder: CollectionConfig = {
    slug: rolesSlug,
    fields: [],
  }

  // Include the roles collection in the permissions list
  const collectionsWithRoles = [...collections, rolesPlaceholder]

  return {
    slug: rolesSlug,
    admin: {
      useAsTitle: 'label',
      defaultColumns: ['label', 'name', 'permissions', 'active'],
      description: 'Manage admin roles and their permissions',
      group: options.rolesGroup || 'System',
      // Hidden function will be added by the wrapper based on roles.manage permission
    },
  access: {
    // All authenticated users can read roles (needed for relationships)
    read: async ({ req }) => {
      // Allow reading roles during first user setup
      if (!req.user) {
        // Check if this is the first user setup by counting backend users
        try {
          const userCount = await req.payload.count({
            collection: 'backend-users',
          })
          // Allow read access if no users exist (first user setup)
          if (userCount.totalDocs === 0) {
            return true
          }
        } catch (error) {
          // If we can't count, deny access
          console.error('Error checking user count for roles access:', error)
        }
        return false
      }
      return true
    },
    create: async ({ req: { user, payload } }) => {
      if (!user || !('role' in user) || !user.role) return false
      return await checkPermission(payload, user.role, 'roles.create')
    },
    update: async ({ req: { user, payload } }) => {
      if (!user || !('role' in user) || !user.role) return false
      return await checkPermission(payload, user.role, 'roles.update')
    },
    delete: async ({ req: { user, payload } }) => {
      if (!user || !('role' in user) || !user.role) return false
      return await checkPermission(payload, user.role, 'roles.delete')
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique role identifier (e.g., super_admin, admin, editor)',
      },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'Display name for the role',
      },
    },
    {
      name: 'permissions',
      type: 'select',
      hasMany: true,
      required: false,
      options: generateCollectionPermissions(collectionsWithRoles, options.customPermissions).map(perm => ({
        label: perm.label,
        value: perm.value,
      })),
      admin: {
        description: 'Select permissions for this role. Use * for full access.',
        className: 'permissions-select-field',
        components: {
          Field: {
            path: 'payload-gatekeeper/components/PermissionsSelectWrapper',
            exportName: 'PermissionsSelectWrapper',
          },
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description of the role and its purpose',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      required: true,
      admin: {
        description: 'Inactive roles cannot be used',
      },
    },
    {
      name: 'protected',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true, // Don't show in UI
      },
    },
    // System management fields for role synchronization
    {
      name: 'configHash',
      type: 'text',
      label: 'Configuration Hash',
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Hash of the role configuration for version tracking',
      },
    },
    {
      name: 'configVersion',
      type: 'number',
      label: 'Configuration Version',
      defaultValue: 0,
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Version number for optimistic locking',
      },
    },
    {
      name: 'systemManaged',
      type: 'checkbox',
      label: 'System Managed',
      defaultValue: false,
      admin: {
        hidden: true,
        description: 'Indicates if this role is managed by the system',
      },
    },
    {
      name: 'visibleFor',
      type: 'select',
      hasMany: true,
      required: false,
      options: collections
        .filter(c => c.auth === true || (c.auth && typeof c.auth === 'object'))
        .map(c => ({
          label: c.labels?.singular || formatLabel(c.slug),
          value: c.slug,
        })),
      admin: {
        description: 'Select which collections can see and assign this role. Leave empty for all collections.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      (async ({ data, operation, originalDoc }) => {
        // Skip during seeding
        const shouldSkip =
          options.seedingMode === true ||
          (typeof options.skipPermissionChecks === 'function'
            ? options.skipPermissionChecks()
            : options.skipPermissionChecks)

        if (shouldSkip) {
          return data
        }

        // Protect super admin role
        if (originalDoc?.protected && operation === 'update') {
          // Only allow certain fields to be updated
          const allowedFields = ['description', 'permissions']
          const updates = Object.keys(data || {})
          const hasDisallowedFields = updates.some(field => !allowedFields.includes(field))

          if (hasDisallowedFields) {
            throw new Error('Protected roles can only have their description and permissions updated')
          }
        }

        return data
      }) satisfies CollectionBeforeChangeHook,
    ],
    beforeDelete: [
      (async ({ id, req }) => {
        const doc = await req.payload.findByID({ collection: getRolesSlug() as 'roles', id })
        if (doc?.protected) {
          throw new Error('Protected roles cannot be deleted')
        }
      }) satisfies CollectionBeforeDeleteHook,
    ],
    afterChange: [
      (async ({ doc, operation }) => {
        // Create super admin role if it doesn't exist
        if (operation === 'create' && doc.name === DEFAULT_SUPER_ADMIN_ROLE.name) {
          console.info('✅ Super Admin role created')
        }
        return doc
      }) satisfies CollectionAfterChangeHook,
    ],
  },
  timestamps: true,
  }
}
