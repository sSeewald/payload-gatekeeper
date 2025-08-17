import { checkPermission } from '../utils/checkPermission'
import type { GatekeeperOptions } from '../types'

/**
 * Global beforeOperation hook to check permissions
 */
export const createBeforeOperationHook = (options: GatekeeperOptions = {}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ args, operation }: any) => {
    // Skip permission check for excluded collections
    if (options.excludeCollections?.includes(args.collection)) {
      return args
    }

    // Skip during seeding - check config only
    const shouldSkip =
      options.seedingMode === true ||
      (typeof options.skipPermissionChecks === 'function'
        ? options.skipPermissionChecks()
        : options.skipPermissionChecks)

    if (shouldSkip) {
      return args
    }

    const { req, collection } = args

    // Skip if no user (public access will be handled by collection access control)
    if (!req?.user) {
      return args
    }

    // Skip if user doesn't have role (shouldn't happen for backend users)
    if (!('role' in req.user) || !req.user.role) {
      return args
    }

    // Build permission string
    const permission = `${collection}.${operation}`

    // Check permission (pass user ID for first user check)
    const hasAccess = await checkPermission(req.payload, req.user.role, permission, req.user.id)

    if (!hasAccess) {
      // Log if audit is enabled
      if (options.enableAuditLog) {
        console.warn(`🚫 Permission denied: User ${req.user.email} tried ${permission}`)
      }

      throw new Error(`Permission denied: You don't have ${operation} access to ${collection}`)
    }

    // Log successful access if audit is enabled
    if (options.enableAuditLog) {
      console.info(`✅ Permission granted: User ${req.user.email} performed ${permission}`)
    }

    return args
  }
}
