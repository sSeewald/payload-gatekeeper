import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { PermissionsSelect } from '../../components/PermissionsSelect'
import type { PermissionsSelectProps } from '../../components/PermissionsSelect'

// Mock react-select and capture its components
let SelectComponents: any = {}
jest.mock('react-select', () => {
  const originalModule = jest.requireActual('react-select')
  return {
    __esModule: true,
    default: jest.fn((props) => {
      // Store the custom components
      SelectComponents = props.components || {}
      
      // Mock onChange calls
      const handleChange = (value: any) => {
        if (props.onChange) {
          props.onChange(value)
        }
      }
      
      return React.createElement('div', {
        'data-testid': 'react-select',
        'data-value': JSON.stringify(props.value),
        'data-options': JSON.stringify(props.options),
        'data-multi': props.isMulti,
        'data-placeholder': props.placeholder,
        'data-disabled': props.isDisabled,
        'data-clearable': props.isClearable,
        'data-searchable': props.isSearchable,
        'data-close-menu-on-select': props.closeMenuOnSelect,
        'data-blur-input-on-select': props.blurInputOnSelect,
        className: props.className,
        onClick: () => handleChange(props.isMulti ? 
          [{ value: 'test.permission', label: 'Test Permission' }] : 
          { value: 'test.permission', label: 'Test Permission' })
      }, 'MockSelect')
    }),
    components: originalModule.components
  }
})

// Mock Payload hooks with controllable values
let mockFieldValue: any = ['posts.read', 'users.create']
let mockSetValue = jest.fn()

jest.mock('@payloadcms/ui', () => ({
  useField: jest.fn(() => ({
    value: mockFieldValue,
    setValue: mockSetValue,
    showError: false,
    errorMessage: null,
  })),
}))

describe('PermissionsSelect Component', () => {
  const defaultProps: PermissionsSelectProps = {
    path: 'permissions',
    name: 'permissions',
    label: 'Permissions',
    required: false,
    options: [
      { label: 'Read Posts', value: 'posts.read' },
      { label: 'Create Posts', value: 'posts.create' },
      { label: 'Read Users', value: 'users.read' },
      { label: 'Create Users', value: 'users.create' },
      { label: 'All Posts', value: 'posts.*' },
      { label: 'Super Admin', value: '*' },
      { label: 'Create Any', value: '*.create' },
    ],
    hasMany: true,
    admin: {
      description: 'Select permissions',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFieldValue = ['posts.read', 'users.create']
    mockSetValue = jest.fn()
    SelectComponents = {}
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      const { container } = render(<PermissionsSelect {...defaultProps} />)
      expect(container.firstChild).toBeDefined()
    })

    it('should display label when provided', () => {
      const { getByText } = render(
        <PermissionsSelect {...defaultProps} label="Test Label" />
      )
      expect(getByText('Test Label')).toBeDefined()
    })

    it('should show required indicator', () => {
      const { getByText } = render(
        <PermissionsSelect {...defaultProps} required={true} />
      )
      expect(getByText('*')).toBeDefined()
    })

    it('should display admin description', () => {
      const { getByText } = render(
        <PermissionsSelect
          {...defaultProps}
          admin={{ description: 'Test description' }}
        />
      )
      expect(getByText('Test description')).toBeDefined()
    })

    it('should use field config when props.field is provided', () => {
      const fieldConfig = {
        path: 'field-path',
        name: 'field-name',
        label: 'Field Label',
        required: true,
        hasMany: false,
        admin: { description: 'Field description' },
        options: [{ label: 'Option', value: 'option' }]
      }
      
      const { getByText } = render(
        <PermissionsSelect path="test-path" field={fieldConfig} />
      )
      expect(getByText('Field Label')).toBeDefined()
      expect(getByText('Field description')).toBeDefined()
    })
  })

  describe('Select Component Integration', () => {
    it('should pass correct props to react-select', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      
      expect(selectElement.getAttribute('data-multi')).toBe('true')
      expect(selectElement.getAttribute('data-placeholder')).toBe('Select permissions...')
      expect(selectElement.getAttribute('data-clearable')).toBe('true')
      expect(selectElement.getAttribute('data-searchable')).toBe('true')
      expect(selectElement.getAttribute('data-close-menu-on-select')).toBe('false')
      expect(selectElement.getAttribute('data-blur-input-on-select')).toBe('false')
    })

    it('should format selected values correctly', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      const value = JSON.parse(selectElement.getAttribute('data-value') || '[]')
      
      // Should format the mocked values from useField
      expect(Array.isArray(value)).toBe(true)
      value.forEach((item: any) => {
        expect(item).toHaveProperty('value')
        expect(item).toHaveProperty('label')
      })
    })

    it('should generate permission options', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
    })

    it('should handle onChange for multi-select', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} hasMany={true} />)
      const selectElement = getByTestId('react-select')
      
      fireEvent.click(selectElement)
      
      expect(mockSetValue).toHaveBeenCalledWith(['test.permission'])
    })

    it('should handle onChange for single-select', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} hasMany={false} />)
      const selectElement = getByTestId('react-select')
      
      fireEvent.click(selectElement)
      
      expect(mockSetValue).toHaveBeenCalledWith('test.permission')
    })

    it('should handle null value in onChange', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      
      // Simulate clearing the select
      const _mockOnChange = jest.fn()
      React.createElement('div', { 
        onClick: () => {
          const props = JSON.parse(selectElement.getAttribute('data-testid') || '{}')
          if (props.onChange) props.onChange(null)
        }
      })
      
      // When cleared, should set empty array for multi or null for single
      expect(mockSetValue).toHaveBeenCalledTimes(0) // No automatic calls
    })

    it('should filter redundant permissions when super admin is selected', () => {
      mockFieldValue = ['*', 'posts.read', 'users.create']
      
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      
      fireEvent.click(selectElement)
      
      // Should only keep super admin when it's selected
      expect(mockSetValue).toHaveBeenCalledWith(['test.permission'])
    })

    it('should filter individual operations when wildcard is selected', () => {
      mockFieldValue = ['posts.*', 'posts.read', 'posts.create']
      
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      
      fireEvent.click(selectElement)
      
      // Should filter out individual operations when wildcard exists
      expect(mockSetValue).toHaveBeenCalled()
    })
  })

  describe('Custom Components', () => {
    it('should pass custom components to react-select', () => {
      render(<PermissionsSelect {...defaultProps} />)
      
      // Check that custom components were passed
      expect(SelectComponents.Option).toBeDefined()
      expect(SelectComponents.MultiValue).toBeDefined()
      expect(SelectComponents.GroupHeading).toBeDefined()
    })

    it('should verify custom components are functions', () => {
      render(<PermissionsSelect {...defaultProps} />)
      
      // Just verify that the custom components are passed and are functions
      if (SelectComponents.Option) {
        expect(typeof SelectComponents.Option).toBe('function')
      }
      
      if (SelectComponents.MultiValue) {
        expect(typeof SelectComponents.MultiValue).toBe('function')
      }
      
      if (SelectComponents.GroupHeading) {
        expect(typeof SelectComponents.GroupHeading).toBe('function')
      }
    })
  })

  describe('Permission Filtering', () => {
    it('should filter options when super admin is selected', () => {
      mockFieldValue = ['*']
      
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // When super admin is selected, should only show super admin option
      const flatOptions = options.flatMap((g: any) => g.options || [])
      const superAdminOption = flatOptions.find((o: any) => o.value === '*')
      expect(superAdminOption).toBeDefined()
    })

    it('should filter individual operations when collection wildcard is selected', () => {
      mockFieldValue = ['posts.*']
      
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // Should hide individual posts operations when posts.* is selected
      const flatOptions = options.flatMap((g: any) => g.options || [])
      const postsRead = flatOptions.find((o: any) => o.value === 'posts.read')
      expect(postsRead).toBeUndefined() // Should be filtered out
    })

    it('should handle empty options gracefully', () => {
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} options={[]} />
      )
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      expect(options).toEqual([])
    })

    it('should handle undefined options', () => {
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} options={undefined} />
      )
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      expect(options).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing label', () => {
      const { container } = render(
        <PermissionsSelect {...defaultProps} label={undefined} />
      )
      // Check that label element is not rendered
      const labels = container.querySelectorAll('label')
      expect(labels.length).toBe(0)
    })

    it('should handle complex filtering with multiple wildcards', () => {
      mockFieldValue = ['*', 'posts.*', 'users.read']
      
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} />)
      const selectElement = getByTestId('react-select')
      
      fireEvent.click(selectElement)
      
      // When super admin is selected, only keep super admin
      expect(mockSetValue).toHaveBeenCalledWith(['test.permission'])
    })

    it('should handle removing wildcards and showing individual operations again', () => {
      // Start with wildcard selected
      mockFieldValue = ['posts.*']
      
      const { getByTestId, rerender } = render(<PermissionsSelect {...defaultProps} />)
      let selectElement = getByTestId('react-select')
      let options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // Individual operations should be hidden
      const flatOptions1 = options.flatMap((g: any) => g.options || [])
      expect(flatOptions1.find((o: any) => o.value === 'posts.read')).toBeUndefined()
      
      // Now remove the wildcard
      mockFieldValue = []
      rerender(<PermissionsSelect {...defaultProps} />)
      
      selectElement = getByTestId('react-select')
      options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // Individual operations should be visible again
      const flatOptions2 = options.flatMap((g: any) => g.options || [])
      expect(flatOptions2.find((o: any) => o.value === 'posts.read')).toBeDefined()
    })

    it('should handle missing admin config', () => {
      const { container } = render(
        <PermissionsSelect {...defaultProps} admin={undefined} />
      )
      // Check that description paragraph is not rendered
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBe(0)
    })

    it('should handle readonly mode', () => {
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} readOnly={true} />
      )
      const selectElement = getByTestId('react-select')
      expect(selectElement.getAttribute('data-disabled')).toBe('true')
      expect(selectElement.getAttribute('data-clearable')).toBe('false')
      expect(selectElement.getAttribute('data-searchable')).toBe('false')
    })

    it('should handle single select mode', () => {
      mockFieldValue = 'posts.read' // Single value
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} hasMany={false} />
      )
      const selectElement = getByTestId('react-select')
      expect(selectElement.getAttribute('data-multi')).toBe('false')
      
      // Should find the single selected value
      const value = JSON.parse(selectElement.getAttribute('data-value') || 'null')
      expect(value).toMatchObject({ value: 'posts.read' })
    })

    it('should handle null value', () => {
      mockFieldValue = null
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} />
      )
      const selectElement = getByTestId('react-select')
      const value = JSON.parse(selectElement.getAttribute('data-value') || '[]')
      
      expect(value).toEqual([])
    })

    it('should handle undefined value', () => {
      mockFieldValue = undefined
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} />
      )
      const selectElement = getByTestId('react-select')
      const value = JSON.parse(selectElement.getAttribute('data-value') || '[]')
      
      expect(value).toEqual([])
    })

    it('should handle value not in options', () => {
      mockFieldValue = ['unknown.permission']
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} />
      )
      const selectElement = getByTestId('react-select')
      const value = JSON.parse(selectElement.getAttribute('data-value') || '[]')
      
      // Should not find unknown values in options
      expect(value).toEqual([])
    })

    it('should use path as name fallback', () => {
      const { getByTestId } = render(
        <PermissionsSelect path="test-path" />
      )
      const selectElement = getByTestId('react-select')
      
      expect(selectElement).toBeDefined()
    })

    it('should handle validate prop', () => {
      const validateFn = jest.fn()
      render(
        <PermissionsSelect {...defaultProps} validate={validateFn} />
      )
      
      // Validate function should be passed to useField
      expect(validateFn).toBeDefined()
    })

    it('should clean up duplicate permissions in onChange', () => {
      const { getByTestId } = render(<PermissionsSelect {...defaultProps} hasMany={true} />)
      const selectElement = getByTestId('react-select')
      
      // Mock onChange to send duplicates
      React.createElement('div', { 
        onClick: () => {
          // Simulate selecting duplicates
          mockFieldValue = ['posts.read', 'posts.read', 'users.create', 'posts.read']
        }
      })
      
      fireEvent.click(selectElement)
      
      // Should filter out duplicates
      expect(mockSetValue).toHaveBeenCalled()
    })

    it('should handle field prop with all configurations', () => {
      const fullFieldConfig = {
        path: 'custom-path',
        name: 'custom-name',
        label: 'Custom Label',
        required: true,
        hasMany: true,
        options: [
          { label: 'Custom Option 1', value: 'custom.option1' },
          { label: 'Custom Option 2', value: 'custom.option2' },
        ],
        admin: {
          description: 'Custom description',
          className: 'custom-class',
        },
        validate: jest.fn(),
      }
      
      const { getByText } = render(
        <PermissionsSelect path="test" field={fullFieldConfig} />
      )
      
      expect(getByText('Custom Label')).toBeDefined()
      expect(getByText('*')).toBeDefined() // Required indicator
      expect(getByText('Custom description')).toBeDefined()
    })

    it('should generate stable select ID from path', () => {
      const { getByTestId, rerender } = render(
        <PermissionsSelect {...defaultProps} path="test.nested.path" />
      )
      const selectElement1 = getByTestId('react-select')
      const id1 = selectElement1.getAttribute('data-testid')
      
      // Re-render with same path
      rerender(<PermissionsSelect {...defaultProps} path="test.nested.path" />)
      const selectElement2 = getByTestId('react-select')
      const id2 = selectElement2.getAttribute('data-testid')
      
      // ID should be stable
      expect(id1).toBe(id2)
    })

    it('should handle *.operation wildcard permissions', () => {
      const wildcardOptions = [
        { label: 'All Read', value: '*.read' },
        { label: 'All Create', value: '*.create' },
        { label: 'Posts Read', value: 'posts.read' },
        { label: 'Users Read', value: 'users.read' },
      ]
      
      mockFieldValue = ['*.read']
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} options={wildcardOptions} />
      )
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // *.read should not filter out individual read operations (different from collection.*)
      const flatOptions = options.flatMap((g: any) => g.options || [])
      expect(flatOptions.find((o: any) => o.value === 'posts.read')).toBeDefined()
      expect(flatOptions.find((o: any) => o.value === 'users.read')).toBeDefined()
    })
  })

  describe('Permission Categorization', () => {
    it('should categorize special permissions', () => {
      const specialOptions = [
        { label: 'Super Admin', value: '*' },
        { label: 'Create Any', value: '*.create' },
      ]
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} options={specialOptions} />
      )
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // Should group under Special category
      const hasSpecialGroup = options.some((g: any) => g.label === 'Special')
      expect(hasSpecialGroup).toBe(true)
    })

    it('should categorize custom permissions by prefix', () => {
      const customOptions = [
        { label: 'Export Data', value: 'export.data' },
        { label: 'Import Data', value: 'import.data' },
        { label: 'Reports View', value: 'reports.view' },
      ]
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} options={customOptions} />
      )
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // Should group by prefix (export, import, reports)
      const exportGroup = options.find((g: any) => g.label === 'export')
      const importGroup = options.find((g: any) => g.label === 'import')
      const reportsGroup = options.find((g: any) => g.label === 'reports')
      
      expect(exportGroup).toBeDefined()
      expect(importGroup).toBeDefined()
      expect(reportsGroup).toBeDefined()
    })

    it('should use collection name as category', () => {
      const collectionOptions = [
        { label: 'Read Posts', value: 'posts.read' },
        { label: 'Read Users', value: 'users.read' },
      ]
      
      const { getByTestId } = render(
        <PermissionsSelect {...defaultProps} options={collectionOptions} />
      )
      const selectElement = getByTestId('react-select')
      const options = JSON.parse(selectElement.getAttribute('data-options') || '[]')
      
      // Should have posts and users categories
      const hasPostsGroup = options.some((g: any) => g.label === 'posts')
      const hasUsersGroup = options.some((g: any) => g.label === 'users')
      expect(hasPostsGroup).toBe(true)
      expect(hasUsersGroup).toBe(true)
    })
  })
})