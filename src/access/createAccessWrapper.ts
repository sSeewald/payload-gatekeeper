import type { Access } from 'payload'
import type { GatekeeperOptions } from '../types'

/**
 * Creates a wrapper for access control functions that checks permissions first,
 * then delegates to the original access control if it exists
 */
export const createAccessWrapper = (
  collectionSlug: string,
  operation: 'create' | 'read' | 'update' | 'delete',
  originalAccess?: Access,
  options?: GatekeeperOptions
): Access => {
  return async (args) => {
    const { checkPermission } = await import('../utils/checkPermission')

    // Public user handling for read operations
    if (!args.req.user && operation === 'read') {
      // Pass through to checkPermission which handles public role
      const hasPermission = await checkPermission(
        args.req.payload,
        null,
        `${collectionSlug}.${operation}`,
        undefined,
        options
      )
      
      if (!hasPermission) return false
      
      // Check original access if exists
      if (originalAccess) {
        return await originalAccess(args)
      }
      
      return true
    }

    // No user for non-read operations = denied
    if (!args.req.user) return false
    
    const hasPermission = await checkPermission(
      args.req.payload,
      args.req.user.role,
      `${collectionSlug}.${operation}`,
      args.req.user.id,
      options
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