import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { PermissionsSelectWrapper } from '../../components/PermissionsSelectWrapper'

// Mock the PermissionsSelect component
jest.mock('../../components/PermissionsSelect', () => ({
  PermissionsSelect: jest.fn((props) => 
    React.createElement('div', { 
      'data-testid': 'permissions-select',
      'data-props': JSON.stringify(props)
    }, 'PermissionsSelect')
  ),
}))

// Store original React hooks
const originalUseState = React.useState
const originalUseEffect = React.useEffect

describe('PermissionsSelectWrapper Component', () => {
  const defaultProps = {
    path: 'permissions',
    name: 'permissions', 
    label: 'Permissions',
    required: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore original hooks
    React.useState = originalUseState
    React.useEffect = originalUseEffect
  })

  describe('SSR Handling', () => {
    beforeEach(() => {
      // Mock useState to always return false (not mounted)
      React.useState = jest.fn(() => [false, jest.fn()])
      // Mock useEffect to prevent mounting
      React.useEffect = jest.fn()
    })

    it('should render loading state initially', () => {
      const { getByText } = render(<PermissionsSelectWrapper {...defaultProps} />)
      expect(getByText('Loading permissions...')).toBeDefined()
    })

    it('should display label in loading state', () => {
      const { getByText } = render(
        <PermissionsSelectWrapper {...defaultProps} label="Test Label" />
      )
      expect(getByText('Test Label')).toBeDefined()
    })

    it('should show required asterisk in loading state', () => {
      const { getByText } = render(
        <PermissionsSelectWrapper {...defaultProps} label="Test Label" required={true} />
      )
      expect(getByText('*')).toBeDefined()
    })

    it('should display description in loading state', () => {
      const { getByText } = render(
        <PermissionsSelectWrapper
          {...defaultProps}
          admin={{ description: 'Test description' }}
        />
      )
      expect(getByText('Test description')).toBeDefined()
    })
  })

  describe('Client-Side Rendering', () => {
    beforeEach(() => {
      // Restore original hooks for client-side tests
      React.useState = originalUseState
      React.useEffect = originalUseEffect
    })

    it('should render PermissionsSelect after mounting', async () => {
      const { getByTestId, queryByText } = render(
        <PermissionsSelectWrapper {...defaultProps} />
      )
      
      // Wait for the component to mount
      await waitFor(() => {
        expect(getByTestId('permissions-select')).toBeDefined()
      })
      
      // Loading state should be gone
      expect(queryByText('Loading permissions...')).toBeNull()
    })

    it('should pass all props to PermissionsSelect', async () => {
      const customProps = {
        ...defaultProps,
        label: 'Custom Label',
        required: true,
        admin: {
          description: 'Custom description',
        },
      }
      
      const { getByTestId } = render(<PermissionsSelectWrapper {...customProps} />)
      
      await waitFor(() => {
        const selectElement = getByTestId('permissions-select')
        const props = JSON.parse(selectElement.getAttribute('data-props') || '{}')
        expect(props).toEqual(customProps)
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Mock useState to always return false for edge case tests
      React.useState = jest.fn(() => [false, jest.fn()])
      React.useEffect = jest.fn()
    })

    it('should handle missing label', () => {
      const { container } = render(
        <PermissionsSelectWrapper {...defaultProps} label={undefined} />
      )
      const labels = container.querySelectorAll('label')
      expect(labels.length).toBe(0)
    })

    it('should handle null admin config', () => {
      const { container } = render(
        <PermissionsSelectWrapper {...defaultProps} admin={null as any} />
      )
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBe(0)
    })

    it('should handle empty admin object', () => {
      const { container } = render(
        <PermissionsSelectWrapper {...defaultProps} admin={{}} />
      )
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBe(0)
    })
  })
})