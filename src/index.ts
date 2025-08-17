import type { Config, Plugin, CollectionConfig } from 'payload'
import type { GatekeeperOptions, CollectionPermissionConfig } from './types'

// Internal type for collection processing
interface ProcessingCollectionConfig extends CollectionConfig {
  _needsAccessControl?: boolean
}
import { createRolesCollection } from './collections/Roles'
import { enhanceAdminCollection } from './utils/enhanceAdminCollection'
import { syncSystemRoles } from './utils/syncRoles'
import { SUPER_ADMIN_ROLE } from './defaultRoles'
import { createAfterChangeHook } from './hooks'
import { setRolesSlug, getRolesSlug } from './utils/getRolesSlug'
import { createCollectionAccess, createUIVisibilityCheck } from './access'

/**
 * Payload Gatekeeper - The ultimate access control plugin for Payload CMS
 *
 * Features:
 * - Automatic permission generation for all collections
 * - Role-based access control
 * - Wildcard permissions support
 * - Super admin management
 * - Audit logging (optional)
 *
 * Your collections' trusted guardian 🚪
 */
export const gatekeeperPlugin = (options: GatekeeperOptions = {}): Plugin => {
  return async (config: Config): Promise<Config> => {
    const {
      collections: collectionConfigs = {},
      defaultConfig = {},
      excludeCollections = [],
      // Legacy support
      enhanceAdminUser,
      enhanceAllAuthCollections,
      roleFieldPlacement,
      rolesSlug = 'roles',
    } = options

    // Set the roles slug globally
    setRolesSlug(rolesSlug)

    // Get admin user collection slug
    const adminCollectionSlug = config.admin?.user

    if (!adminCollectionSlug) {
      console.warn('⚠️ No admin user collection configured. Permissions plugin may not work correctly.')
    }

    // Build collection configs (handle legacy options)
    const finalCollectionConfigs = { ...collectionConfigs }

    // Handle legacy enhanceAdminUser option
    if (enhanceAdminUser !== undefined && adminCollectionSlug && !finalCollectionConfigs[adminCollectionSlug]) {
      finalCollectionConfigs[adminCollectionSlug] = {
        enhance: enhanceAdminUser,
        roleFieldPlacement: roleFieldPlacement,
        autoAssignFirstUser: true,
      }
    }

    // Process collections
    let enhancedCollections: ProcessingCollectionConfig[] = [...(config.collections || [])]

    enhancedCollections = enhancedCollections.map(collection => {
      let processedCollection: ProcessingCollectionConfig = collection

      // Determine configuration for this collection once
      let collectionConfig = finalCollectionConfigs[collection.slug]
      const isExcluded = excludeCollections.includes(collection.slug)

      // If not explicitly configured, check if we should use default
      if (!collectionConfig && collection.auth === true) {
        // Legacy: enhanceAllAuthCollections
        if (enhanceAllAuthCollections) {
          collectionConfig = {
            enhance: true,
            ...defaultConfig,
          }
        } else if (defaultConfig.enhance) {
          collectionConfig = defaultConfig as CollectionPermissionConfig
        }
      }

      // Phase 1: Enhancement (if configured)
      if (collectionConfig?.enhance) {
        // Prepare options for enhancement
        const enhanceOptions = {
          ...options,
          roleFieldPlacement: collectionConfig.roleFieldPlacement || options.roleFieldPlacement,
          roleFieldConfig: collectionConfig.roleFieldConfig,
        }

        // Enhance with role field
        processedCollection = enhanceAdminCollection(processedCollection, enhanceOptions)

        // Add hooks based on collection config
        if (collectionConfig.autoAssignFirstUser || collectionConfig.defaultRole) {
          const existingAfterChange = processedCollection.hooks?.afterChange || []
          const afterChangeHooks = Array.isArray(existingAfterChange)
            ? existingAfterChange
            : [existingAfterChange].filter(Boolean)

          processedCollection = {
            ...processedCollection,
            hooks: {
              ...processedCollection.hooks,
              afterChange: [
                ...afterChangeHooks,
                createAfterChangeHook(collection.slug, collectionConfig),
              ]
            }
          }
        }
      }

      // Phase 2: Access Control (unless excluded) - moved here for single pass
      if (!isExcluded) {
        // Will be applied after roles collection is added
        // Mark for access control application
        processedCollection._needsAccessControl = true
      }

      return processedCollection
    })

    // Create Roles collection with all available collections
    const rolesCollection = createRolesCollection(enhancedCollections, options)

    // Add Roles collection if it doesn't exist
    const hasRolesCollection = enhancedCollections.some(c => c.slug === rolesSlug)
    if (!hasRolesCollection) {
      // Check if Roles collection should be excluded from access control
      const isRolesExcluded = excludeCollections.includes(rolesSlug)

      // Mark the Roles collection for access control if not excluded
      const rolesWithMarker: ProcessingCollectionConfig = {
        ...rolesCollection,
        _needsAccessControl: !isRolesExcluded
      }

      enhancedCollections.push(rolesWithMarker)
    }

    // Apply access control to marked collections and clean up
    const finalCollections = enhancedCollections.map(collection => {
      // Skip if not marked for access control
      if (!collection._needsAccessControl) {
        // Return without marker
        const { _needsAccessControl, ...cleanCollection } = collection
        return cleanCollection as CollectionConfig
      }

      // Remove marker for access control processing
      const { _needsAccessControl, ...cleanCollection } = collection

      // Add UI visibility check based on 'manage' permission as wrapper
      const originalHidden = collection.admin?.hidden
      const permissionHidden = createUIVisibilityCheck(collection.slug)

      const enhancedAdmin = {
        ...collection.admin,
        // Wrapper: Check original hidden function first, then permission-based visibility
        hidden: typeof originalHidden === 'function'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (args: any) => {
              // First check original hidden function
              const isOriginallyHidden = originalHidden(args)
              if (isOriginallyHidden) return true

              // Then check permission-based visibility
              return permissionHidden(args)
            }
          : originalHidden === true
            ? true  // If originally always hidden, keep it hidden
            : permissionHidden  // Otherwise use permission check
      }

      // Add permission-based access control as wrapper around existing access control
      return {
        ...cleanCollection,
        admin: enhancedAdmin,
        access: createCollectionAccess(cleanCollection),
      } as CollectionConfig
    })

    // Return enhanced config
    return {
      ...config,
      collections: finalCollections,
      onInit: async (payload) => {
        // Check if roles exist
        const rolesCount = await payload.count({ collection: getRolesSlug() as 'roles' })
        // Sync system roles if:
        // - No roles exist (first start)
        // - In development mode
        // - Explicitly requested via config
        const shouldSyncRoles =
          rolesCount.totalDocs === 0 ||  // Automatically sync on first start
          process.env.NODE_ENV === 'development' ||
          options.syncRolesOnInit === true

        if (shouldSyncRoles) {
          console.info('🔄 Syncing system roles...')
          try {
            // Identify admin collections (those with autoAssignFirstUser)
            const adminCollections = Object.entries(finalCollectionConfigs)
              .filter(([_, config]) => config.enhance && config.autoAssignFirstUser)
              .map(([slug]) => slug)

            // Configure Super Admin role visibility
            const superAdminRole = {
              ...SUPER_ADMIN_ROLE,
              // Super Admin only visible for admin collections
              visibleFor: adminCollections.length > 0 ? adminCollections : undefined
            }

            // Always include super_admin, plus any configured roles
            const rolesToSync = [
              superAdminRole,
              ...(options.systemRoles || [])
            ]

            const results = await syncSystemRoles(payload, rolesToSync)

            // Only log if there were changes
            if (results.created.length > 0 || results.updated.length > 0) {
              console.info('✅ Role sync completed')
            }
          } catch (error) {
            console.error('❌ Error syncing roles:', error)
            // Don't fail initialization if role sync fails
            // The system can still work with existing roles
          }
        }

        // Run original onInit if exists
        if (config.onInit) {
          await config.onInit(payload)
        }
      },
    }
  }
}

// Export utilities for use outside the plugin
export { checkPermission, hasPermission, canAssignRole } from './utils/checkPermission'
export { PERMISSIONS } from './constants'
export { EXAMPLE_ROLES } from './defaultRoles'

// Export types
export type {
  GatekeeperOptions,
  Permission,
  RoleDocument,
  CollectionPermissionConfig,
  SystemRole,
  SyncResults
} from './types'
