import crypto from 'crypto'
import type { Payload } from 'payload'
import { getRolesSlug } from './getRolesSlug'
import type { SystemRole, SyncResults } from '../types'

// Re-export for backward compatibility (will be removed in next major version)
export type DefaultRole = SystemRole

/**
 * Generate a hash from role configuration
 * Used to detect when a role's configuration has changed
 */
function generateRoleHash(permissions: string[], visibleFor?: string[]): string {
  const data = JSON.stringify({ 
    permissions: permissions.sort(),
    visibleFor: visibleFor ? visibleFor.sort() : []
  })
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 16)
}

/**
 * Sync system-managed roles with optimistic locking
 * This ensures role configurations are up-to-date while preventing race conditions
 */
export async function syncSystemRoles(
  payload: Payload,
  defaultRoles: SystemRole[]
): Promise<SyncResults> {
  const results: SyncResults = {
    created: [],
    updated: [],
    failed: [],
    skipped: [],
  }

  for (const defaultRole of defaultRoles) {
    const newHash = generateRoleHash(defaultRole.permissions, defaultRole.visibleFor)

    try {
      // Find existing role
      const existing = await payload.find({
        collection: getRolesSlug() as 'roles',
        where: { name: { equals: defaultRole.name } },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        // Create new role
        try {
          await payload.create({
            collection: getRolesSlug() as 'roles',
            data: {
              ...defaultRole,
              active: defaultRole.active ?? true,  // Ensure active is always boolean
              configHash: newHash,
              configVersion: 1,
              systemManaged: true,
            },
          })
          results.created.push(defaultRole.name)
          console.info(`✅ Created role: ${defaultRole.name}`)
        } catch (createError) {
          // Another instance might have created it concurrently
          results.failed.push({
            role: defaultRole.name,
            error: `Create failed: ${createError instanceof Error ? createError.message : String(createError)}`,
          })
        }
      } else {
        const role = existing.docs[0]

        // Skip non-system-managed roles (user-created)
        if (!role.systemManaged) {
          results.skipped.push(defaultRole.name)
          continue
        }

        // Check if update needed (hash mismatch)
        if (role.configHash !== newHash) {
          try {
            // Optimistic locking update
            // First check if version still matches
            const currentRole = await payload.findByID({
              collection: getRolesSlug() as 'roles',
              id: role.id,
            })

            if (currentRole.configVersion !== role.configVersion) {
              // Another instance already updated
              results.failed.push({
                role: defaultRole.name,
                error: 'Concurrent update detected',
              })
              continue
            }

            // Safe to update
            const updateResult = await payload.update({
              collection: getRolesSlug() as 'roles',
              id: role.id,
              data: {
                permissions: defaultRole.permissions,
                protected: defaultRole.protected ?? role.protected,
                visibleFor: defaultRole.visibleFor,
                configHash: newHash,
                configVersion: (role.configVersion || 0) + 1,
              },
            })

            if (updateResult) {
              results.updated.push(defaultRole.name)
              console.info(`🔄 Updated role: ${defaultRole.name}`)
            }
          } catch (updateError) {
            // Update failed - likely due to version mismatch (another instance updated)
            results.failed.push({
              role: defaultRole.name,
              error: `Update failed (likely concurrent update): ${updateError instanceof Error ? updateError.message : String(updateError)}`,
            })
          }
        }
      }
    } catch (error) {
      results.failed.push({
        role: defaultRole.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Log summary
  if (results.created.length > 0) {
    console.info('✅ Created roles:', results.created.join(', '))
  }
  if (results.updated.length > 0) {
    console.info('🔄 Updated roles:', results.updated.join(', '))
  }
  if (results.skipped.length > 0) {
    console.info('⏭️ Skipped user-created roles:', results.skipped.join(', '))
  }
  if (results.failed.length > 0) {
    console.warn('⚠️ Failed operations (likely handled by another instance):', results.failed)
  }

  return results
}
