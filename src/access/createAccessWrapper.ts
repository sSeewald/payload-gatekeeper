import type { Access } from 'payload'

/**
 * Creates a wrapper for access control functions that checks permissions first,
 * then delegates to the original access control if it exists
 */
export const createAccessWrapper = (
  collectionSlug: string,
  operation: 'create' | 'read' | 'update' | 'delete',
  originalAccess?: Access
): Access => {
  return async (args) => {
    const { checkPermission } = await import('../utils/checkPermission')

    // First check permission
    if (!args.req.user) return false
    
    const hasPermission = await checkPermission(
      args.req.payload,
      args.req.user.role,
      `${collectionSlug}.${operation}`,
      args.req.user.id
    )
    
    if (!hasPermission) return false

    // Then check original access control if it exists
    if (originalAccess) {
      return await originalAccess(args)
    }

    // Default: permission check was sufficient
    return true
  }
}