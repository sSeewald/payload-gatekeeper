import { getRolesSlug } from '../utils/getRolesSlug'

/**
 * Creates an afterLogin hook that populates the user's role
 * This ensures the role object is fully available in the login response
 */
export const createAfterLoginHook = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ user, req }: any) => {
    // If user has a role and it's just an ID (string or number), populate it
    if (user && user.role && (typeof user.role === 'string' || typeof user.role === 'number')) {
      try {
        const role = await req.payload.findByID({
          collection: getRolesSlug() as 'roles',
          id: String(user.role),
          depth: 0, // Don't need nested data
        })

        if (role) {
          // Replace the role ID with the full role object
          user.role = role
        }
      } catch (error) {
        // Log but don't fail the login if role population fails
        console.warn('Could not populate role in afterLogin:', error)
      }
    }

    return user
  }
}
