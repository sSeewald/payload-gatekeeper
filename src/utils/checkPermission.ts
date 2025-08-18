import type { Payload } from 'payload'
import type { GatekeeperOptions } from '../types'
import { PERMISSIONS } from '../constants'
import { getRolesSlug } from './getRolesSlug'

// Regex cache for compiled patterns - safe for multi-instance as patterns don't change
const regexCache = new Map<string, RegExp>()
const MAX_REGEX_CACHE_SIZE = 100


/**
 * Get or create cached regex for permission pattern
 */
const getPermissionRegex = (pattern: string): RegExp => {
  let regex = regexCache.get(pattern)
  if (!regex) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*')    // Convert * to .*
    regex = new RegExp(`^${regexPattern}$`)
    
    // Limit cache size to prevent memory issues
    if (regexCache.size < MAX_REGEX_CACHE_SIZE) {
      regexCache.set(pattern, regex)
    }
  }
  return regex
}

/**
 * Check if user has required permission
 * Supports wildcards and pattern matching
 * Optimized for performance with early returns
 */
export const hasPermission = (
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean => {
  // Early return for invalid input
  if (!userPermissions?.length) {
    return false
  }

  // Most common case: Super admin check
  if (userPermissions.includes(PERMISSIONS.ALL)) {
    return true
  }

  // Second most common: Exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true
  }

  // Optimized wildcard checking
  for (const permission of userPermissions) {
    // Skip non-wildcard permissions (already checked above)
    if (!permission.includes('*')) {
      continue
    }

    // Fast check for common "collection.*" pattern (but only if it's the last segment)
    if (permission.endsWith('.*') && permission.indexOf('*') === permission.length - 1) {
      const prefix = permission.slice(0, -1) // Remove the asterisk
      if (requiredPermission.startsWith(prefix)) {
        return true
      }
      continue
    }

    // All other wildcard patterns (including multiple wildcards, use regex)
    if (getPermissionRegex(permission).test(requiredPermission)) {
      return true
    }
  }

  return false
}

/**
 * Check if a permission is covered by user permissions
 * Handles wildcards like 'users.*' covering 'users.read'
 * Optimized version using early returns and cached regex
 */
export const isPermissionCovered = (
  permission: string,
  userPermissions: string[]
): boolean => {
  // Early return for empty permissions
  if (!userPermissions.length) return false
  
  // Use optimized hasPermission function which already handles all cases efficiently
  return hasPermission(userPermissions, permission)
}

/**
 * Check if user can assign a specific role
 * Based on permission subset check and protected flag
 */
export const canAssignRole = (
  userPermissions: string[],
  targetRole: { protected?: boolean; permissions?: string[]; active?: boolean }
): boolean => {
  // Protected roles need * permission
  if (targetRole.protected && !userPermissions.includes('*')) {
    return false
  }

  // Check if all target permissions are covered by user permissions
  const targetPermissions = targetRole.permissions || []
  return targetPermissions.every((perm: string) =>
    isPermissionCovered(perm, userPermissions)
  )
}

/**
 * Helper function for access control checks
 * Supports string ID, number ID, populated role object, null, and undefined
 * Note: With afterRead hook, role should usually be populated already
 */
export const checkPermission = async (
  payload: Payload,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userRole: string | number | { [key: string]: any } | null | undefined,
  permission: string,
  userId?: string | number,
  options?: GatekeeperOptions
): Promise<boolean> => {
  try {
    // Special case: First user (ID 1) always has all permissions
    // This handles the case where the first user is created without a role
    if (userId && (userId === 1 || userId === '1')) {
      return true
    }

    // Public user (no userId and no role) - use public role permissions
    if (!userId && !userRole) {
      // Check if public role is disabled
      if (options?.disablePublicRole) {
        return false
      }

      // Get public permissions (custom or default)
      const publicPermissions = options?.publicRolePermissions || ['*.read']
      
      // Check permission against public permissions
      return hasPermission(publicPermissions, permission)
    }

    // No role = no permissions (except for first user and public)
    // Allow role ID 0 but not null/undefined
    if (userRole === null || userRole === undefined) {
      return false
    }

    // Get role details based on type
    let role: Record<string, unknown> | null = null
    
    if (typeof userRole === 'object') {
      // Role is already populated (should be the normal case with authenticate hook)
      role = userRole
    } else if (typeof userRole === 'string' || typeof userRole === 'number') {
      // Role is an ID - this is a fallback for cases where authenticate hook didn't run
      // (e.g., during seeding, migrations, or direct API calls)
      const roleId = String(userRole) // Convert number to string for findByID
      
      try {
        role = await payload.findByID({
          collection: getRolesSlug() as 'roles',
          id: roleId,
          depth: 0, // Don't need nested data
        })
      } catch (err) {
        // Role not found or error loading
        console.warn(`Could not load role ${roleId}:`, err)
        return false
      }
    }

    // Check if role exists and is active
    if (!role || (typeof role === 'object' && 'active' in role && !role.active)) {
      return false
    }

    // Check permissions
    const permissions = typeof role === 'object' && 'permissions' in role ? role.permissions as string[] : []
    return hasPermission(permissions, permission)
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}
