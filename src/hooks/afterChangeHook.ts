import type { CollectionAfterChangeHook } from 'payload'
import type { CollectionPermissionConfig } from '../types'
import { getRolesSlug } from '../utils/getRolesSlug'

/**
 * AfterChange hook that handles automatic role assignment
 *
 * This hook runs after user creation and:
 * - Assigns super admin role to first user if autoAssignFirstUser is true
 * - Assigns default role to new users if defaultRole is configured
 */
export const createAfterChangeHook = (
  collectionSlug: string,
  config: CollectionPermissionConfig
): CollectionAfterChangeHook => {
  return async ({ doc, req, operation }) => {
    // Only run for create operations
    if (operation !== 'create') {
      return doc
    }

    // Debug logging
    console.info(`[afterChangeHook] Collection: ${collectionSlug}, Operation: ${operation}, Doc ID: ${doc.id}, Has Role: ${!!doc.role}`)

    // Handle first user auto-assignment (only if configured)
    if (config.autoAssignFirstUser && doc.id === 1 && !doc.role) {
      console.info('[afterChangeHook] First user detected without role, assigning super admin...')

      try {
        // Find super admin role
        const superAdminRole = await req.payload.find({
          collection: getRolesSlug() as 'roles',
          where: {
            name: {
              equals: 'super_admin',
            },
          },
          limit: 1,
        })

        if (superAdminRole.docs.length > 0) {
          console.info(`[afterChangeHook] Found super admin role with ID: ${superAdminRole.docs[0].id}`)

          try {
            // Update user with super admin role using overrideAccess
            // Use context to signal that this is a system update
            await req.payload.update({
              collection: collectionSlug as Parameters<typeof req.payload.update>[0]['collection'],
              id: doc.id,
              data: {
                role: superAdminRole.docs[0].id,
              },
              context: {
                isSystemUpdate: true,  // Signal to filterOptions that this is system update
                skipValidation: true,
              },
              overrideAccess: true, // Bypass validation and access control
            })

            console.info('✅ First user automatically assigned Super Admin role')

            // Update the doc object to reflect the change
            doc.role = superAdminRole.docs[0].id
            return doc
          } catch (updateError) {
            console.error('[afterChangeHook] Failed to update user with role:', updateError)
          }
        }
      } catch (error) {
        console.error('Error assigning super admin role after creation:', error)
      }
    }

    // Handle default role assignment
    if (config.defaultRole && !doc.role) {
      console.info(`[afterChangeHook] Assigning default role '${config.defaultRole}' to new user...`)

      try {
        // Find the default role
        const defaultRole = await req.payload.find({
          collection: getRolesSlug() as 'roles',
          where: {
            name: {
              equals: config.defaultRole,
            },
          },
          limit: 1,
        })

        if (defaultRole.docs.length > 0) {
          console.info(`[afterChangeHook] Found default role with ID: ${defaultRole.docs[0].id}`)

          try {
            // Update user with default role
            await req.payload.update({
              collection: collectionSlug as Parameters<typeof req.payload.update>[0]['collection'],
              id: doc.id,
              data: {
                role: defaultRole.docs[0].id,
              },
              context: {
                isSystemUpdate: true,
                skipValidation: true,
              },
              overrideAccess: true,
            })

            console.info(`✅ User assigned default role '${config.defaultRole}'`)

            // Update the doc object to reflect the change
            doc.role = defaultRole.docs[0].id
          } catch (updateError) {
            console.error('[afterChangeHook] Failed to update user with default role:', updateError)
          }
        } else {
          console.warn(`⚠️ Default role '${config.defaultRole}' not found`)
        }
      } catch (error) {
        console.error('Error assigning default role after creation:', error)
      }
    }

    return doc
  }
}
