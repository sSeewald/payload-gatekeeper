'use client'

import React, { useEffect, useState } from 'react'
import type { PermissionsSelectProps } from './PermissionsSelect'
import { PermissionsSelect } from './PermissionsSelect'

/**
 * Wrapper component that ensures PermissionsSelect only renders on the client
 * This prevents hydration mismatches with react-select
 */
export const PermissionsSelectWrapper: React.FC<PermissionsSelectProps> = props => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Return a placeholder during SSR to prevent hydration mismatch
  if (!isMounted) {
    const loadingStyles = {
      wrapper: { marginBottom: '1rem' },
      label: {
        display: 'block' as const,
        marginBottom: '0.5rem',
        fontWeight: 600,
        color: 'var(--theme-elevation-800)',
      },
      required: {
        color: 'var(--theme-error-500)',
        marginLeft: '0.25rem',
      },
      description: {
        marginTop: '-0.25rem',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        color: 'var(--theme-elevation-600)',
      },
      loading: {
        minHeight: '40px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        padding: '8px 12px',
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-elevation-400)',
        display: 'flex' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        fontStyle: 'italic' as const,
      },
    }

    return (
      <div style={loadingStyles.wrapper}>
        {props.label && (
          <label style={loadingStyles.label}>
            {props.label}
            {props.required && <span style={loadingStyles.required}>*</span>}
          </label>
        )}
        {props.admin?.description && (
          <p style={loadingStyles.description}>{props.admin.description}</p>
        )}
        <div style={loadingStyles.loading}>Loading permissions...</div>
      </div>
    )
  }

  return <PermissionsSelect {...props} />
}
