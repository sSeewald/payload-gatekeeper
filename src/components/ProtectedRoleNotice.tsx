import React from 'react'

/**
 * Simple notice component to display when editing a protected role
 */
export const ProtectedRoleNotice: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: '0.375rem',
        padding: '12px 16px',
        marginBottom: '20px',
        color: '#9a3412',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '18px', lineHeight: '1' }}>🔒</span>
      <div>
        <strong>Protected System Role</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
          This is a protected system role that is essential for the application&apos;s operation. 
          You can customize its description and permissions to meet your needs.
        </p>
      </div>
    </div>
  )
}

export default ProtectedRoleNotice