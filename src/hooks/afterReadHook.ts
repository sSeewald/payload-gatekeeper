import { getRolesSlug } from '../utils/getRolesSlug'

/**
 * Creates an afterRead hook that populates the user's role when the user is loaded
 * This ensures the role object is always available when the user is fetched
 * This runs after authentication and whenever the user document is read
 */
export const createAfterReadHook = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ doc, req }: any) => {
    // If doc has a role, and it's just an ID (string or number), populate it
    if (doc?.role && (typeof doc.role === 'string' || typeof doc.role === 'number')) {
      try {
        const role = await req.payload.findByID({
          collection: getRolesSlug() as 'roles',
          id: String(doc.role),
          depth: 0, // Don't need nested data
        })

        if (role) {
          // Replace the role ID with the full role object
          doc.role = role
        }
      } catch (error) {
        // Log but don't fail the read operation if role population fails
        console.warn('Could not populate role in afterRead:', error)
      }
    }

    return doc
  }
}
