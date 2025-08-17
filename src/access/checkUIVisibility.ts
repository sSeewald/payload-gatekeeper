/**
 * UI Visibility check utilities
 * Collections should only be visible in the admin UI if the user has 'manage' permission
 */

/**
 * Create a hidden function for collections that checks for manage permission
 * @param collectionSlug - The slug of the collection
 * @returns A function that can be used in collection.admin.hidden
 */
export function createUIVisibilityCheck(collectionSlug: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ user }: any) => {
    // Not logged in - hide
    if (!user) return true

    // No role - hide
    if (!user.role) return true

    // Get permissions from role
    let permissions: string[] = []
    if (typeof user.role === 'object' && user.role.permissions) {
      permissions = user.role.permissions || []
    }

    // Check for manage permission (controls UI visibility)
    const hasManagePermission = 
      permissions.includes('*') ||                          // Super admin
      permissions.includes(`${collectionSlug}.*`) ||        // All collection permissions
      permissions.includes(`${collectionSlug}.manage`)      // Specific manage permission

    // Return true to hide, false to show
    return !hasManagePermission
  }
}

/**
 * Check if user has permission to see a collection in the UI
 * This is a helper for custom implementations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canSeeInUI(user: any, collectionSlug: string): boolean {
  if (!user || !user.role) return false

  let permissions: string[] = []
  if (typeof user.role === 'object' && user.role.permissions) {
    permissions = user.role.permissions || []
  }

  return (
    permissions.includes('*') ||
    permissions.includes(`${collectionSlug}.*`) ||
    permissions.includes(`${collectionSlug}.manage`)
  )
}