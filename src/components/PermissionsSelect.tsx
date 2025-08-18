'use client'

import React, { useMemo } from 'react'
import type {
  ClearIndicatorProps,
  DropdownIndicatorProps,
  GroupHeadingProps,
  MultiValue,
  MultiValueProps,
  MultiValueRemoveProps,
  OptionProps,
  SingleValue,
  StylesConfig,
} from 'react-select'
import Select, { components } from 'react-select'
import { useField } from '@payloadcms/ui'
import type { StructuredOption } from '../utils/structurePermissions'
import { structurePermissions } from '../utils/structurePermissions'
import { formatLabel } from '../utils/formatLabel'
// Inline styles to avoid CSS import issues in node_modules
const inlineStyles = {
  wrapper: {
    marginBottom: '1rem',
  },
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
  permissionOption: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '2px 0',
  },
  permissionOptionIndent1: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '2px 0',
    paddingLeft: '1.5rem',
  },
  permissionOptionIndent2: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '2px 0',
    paddingLeft: '3rem',
  },
  parentOption: {
    fontWeight: 600,
    color: 'var(--theme-elevation-800)',
  },
  childOption: {
    fontWeight: 400,
    color: 'var(--theme-elevation-600)',
  },
  optionLabel: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  indentMarker: {
    color: 'var(--theme-elevation-600)',
    marginRight: '0.5rem',
    fontFamily: 'monospace',
  },
  optionCategory: {
    fontSize: '0.75rem',
    padding: '2px 6px',
    borderRadius: '3px',
    background: 'var(--theme-elevation-100)',
    color: 'var(--theme-elevation-600)',
    marginLeft: '0.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.025em',
  },
  loadingState: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: 'var(--theme-elevation-600)',
    fontStyle: 'italic' as const,
  },
}

// Props that Payload passes to custom field components
export interface PermissionsSelectProps {
  path: string
  name?: string
  label?: string
  required?: boolean
  hasMany?: boolean
  options?: Array<{ label: string; value: string }>
  field?: {
    path?: string
    name?: string
    label?: string
    required?: boolean
    hasMany?: boolean
    options?: Array<{ label: string; value: string }>
    admin?: {
      description?: string
      className?: string
    }
    validate?: (
      value: string | string[] | null,
      args?: { siblingData?: Record<string, unknown> }
    ) => string | true | Promise<string | true>
  }
  admin?: {
    description?: string
    className?: string
  }
  validate?: (
    value: string | string[] | null,
    args?: { siblingData?: Record<string, unknown> }
  ) => string | true | Promise<string | true>
  readOnly?: boolean
  permissions?: string[]
}

// Custom Option component with indentation
const CustomOption = (props: OptionProps<StructuredOption, false>) => {
  const { data, children, ...rest } = props
  const indent = data.indent || 0
  const isParent = data.isParent || false

  // Select appropriate style based on indent level
  const optionStyle =
    indent === 2
      ? inlineStyles.permissionOptionIndent2
      : indent === 1
        ? inlineStyles.permissionOptionIndent1
        : inlineStyles.permissionOption

  // Merge with parent/child specific styles
  const finalStyle = {
    ...optionStyle,
    ...(isParent ? inlineStyles.parentOption : inlineStyles.childOption),
  }

  return (
    <components.Option {...rest} data={data}>
      <div style={finalStyle} title={data.description}>
        <span style={inlineStyles.optionLabel}>
          {indent > 0 && <span style={inlineStyles.indentMarker}>└─ </span>}
          {children}
        </span>
        {data.category && indent === 0 && isParent && (
          <span style={inlineStyles.optionCategory}>{data.category}</span>
        )}
      </div>
    </components.Option>
  )
}

// Custom MultiValue component to show clean labels
const CustomMultiValue = (props: MultiValueProps<StructuredOption, false>) => {
  const { data, ...rest } = props
  // Remove indent markers from displayed selected values
  const cleanLabel = data.label.replace(/^\s*└─\s*/, '')

  return (
    <components.MultiValue {...rest} data={data}>
      <span title={data.description}>{cleanLabel}</span>
    </components.MultiValue>
  )
}

// Custom MultiValueRemove with Payload-style X icon
const CustomMultiValueRemove = (props: MultiValueRemoveProps<StructuredOption, false>) => {
  return (
    <components.MultiValueRemove {...props}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </components.MultiValueRemove>
  )
}

// Custom GroupHeading for category separators
const CustomGroupHeading = (props: GroupHeadingProps<StructuredOption, false>) => {
  // Format group label if it looks like a slug (contains hyphen)
  const formattedLabel = props.children?.toString().includes('-')
    ? formatLabel(props.children.toString())
    : props.children

  return <components.GroupHeading {...props}>{formattedLabel}</components.GroupHeading>
}

// Custom ClearIndicator with Payload-style X icon
const CustomClearIndicator = (props: ClearIndicatorProps<StructuredOption, false>) => {
  return (
    <components.ClearIndicator {...props}>
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </components.ClearIndicator>
  )
}

// Custom DropdownIndicator with Payload-style chevron
const CustomDropdownIndicator = (props: DropdownIndicatorProps<StructuredOption, false>) => {
  return (
    <components.DropdownIndicator {...props}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: props.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        <path
          d="M2 4L6 8L10 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </components.DropdownIndicator>
  )
}

export const PermissionsSelect: React.FC<PermissionsSelectProps> = props => {
  // Payload passes field config in different ways
  const field = props.field || props

  const path = props.path || field.path
  const name = props.name || field.name || path
  const label = props.label || field.label
  const required = props.required || field.required
  const hasMany = props.hasMany !== undefined ? props.hasMany : field.hasMany
  const admin = props.admin || field.admin
  const validate = props.validate || field.validate
  const readOnly = props.readOnly || false

  // Get options from field config - Payload stores them in field.options
  const fieldOptions = useMemo(
    () => field?.options || props.options || [],
    [field?.options, props.options]
  )

  const { value, setValue } = useField<string | string[]>({
    path,
    validate,
  })

  // Generate stable ID for react-select to avoid hydration mismatch
  const selectId = useMemo(
    () => `permissions-select-${path?.replace(/\./g, '-') || 'default'}`,
    [path]
  )

  // Transform options into hierarchical structure
  const options = useMemo(() => {
    if (!fieldOptions || fieldOptions.length === 0) {
      return []
    }

    // Get current selected values
    const selectedValues = Array.isArray(value) ? value : value ? [value] : []

    // Check which collections have wildcard selected
    const collectionsWithWildcard = new Set<string>()
    selectedValues.forEach((val: string) => {
      if (val.endsWith('.*')) {
        const collection = val.replace('.*', '')
        collectionsWithWildcard.add(collection)
      }
    })

    // Check if super admin (*) is selected
    const hasSuperAdmin = selectedValues.includes('*')

    // Convert simple options to Permission format for structuring
    const permissions = fieldOptions.map((opt: { label: string; value: string }) => ({
      label: opt.label,
      value: opt.value,
      // Determine category based on value pattern
      category:
        opt.value === '*' || opt.value.startsWith('*.')
          ? 'Special'
          : opt.value.split('.')[0], // Use collection name as category
      description: '',
    }))

    // Filter out redundant permissions
    const filteredPermissions = permissions.filter(
      (perm: { label: string; value: string; category: string; description: string }) => {
        // If super admin is selected, only show super admin option
        if (hasSuperAdmin) {
          return perm.value === '*'
        }

        // If collection wildcard is selected, hide individual CRUD operations for that collection
        const permParts = perm.value.split('.')
        if (permParts.length === 2) {
          const collection = permParts[0]
          const operation = permParts[1]

          // If this collection has wildcard selected, hide individual operations except the wildcard itself
          if (collectionsWithWildcard.has(collection) && operation !== '*') {
            return false
          }
        }

        return true
      }
    )

    const structured = structurePermissions(filteredPermissions)

    // Group by category for visual separation
    const categoryGroups = structured.reduce(
      (acc, option) => {
        const category = option.category || 'Other'
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(option)
        return acc
      },
      {} as Record<string, StructuredOption[]>
    )

    // Convert to react-select group format
    const groupedOptions = Object.entries(categoryGroups).map(([category, items]) => ({
      label: category,
      options: items,
    }))

    return groupedOptions
  }, [fieldOptions, value])

  // Custom styles for react-select
  const customStyles: StylesConfig<StructuredOption, boolean> = {
    control: provided => ({
      ...provided,
      minHeight: '40px',
      borderColor: 'var(--theme-elevation-150)',
      backgroundColor: 'var(--theme-bg)',
      color: 'var(--theme-elevation-800)',
      '&:hover': {
        borderColor: 'var(--theme-elevation-250)',
      },
    }),
    menu: provided => ({
      ...provided,
      zIndex: 9999,
      backgroundColor: 'var(--theme-bg)',
      border: '1px solid var(--theme-elevation-200)',
    }),
    option: (provided, state) => ({
      ...provided,
      padding: '8px 12px',
      backgroundColor: state.isSelected
        ? 'var(--theme-elevation-800)'
        : state.isFocused
          ? 'var(--theme-elevation-100)'
          : 'transparent',
      color: state.isSelected ? 'var(--theme-elevation-0)' : 'var(--theme-elevation-800)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: state.isFocused ? 'var(--theme-elevation-100)' : 'transparent',
      },
    }),
    multiValue: provided => ({
      ...provided,
      backgroundColor: 'var(--theme-elevation-100)',
      border: '1px solid var(--theme-border-color, var(--theme-elevation-200))',
      borderRadius: 'var(--style-radius-s, 4px)',
      margin: '2px',
      transition: 'border-color 0.2s ease',
      '&:hover': {
        border: '1px solid var(--theme-elevation-250)',
      },
    }),
    multiValueLabel: provided => ({
      ...provided,
      color: 'var(--theme-elevation-800)',
      padding: '2px 6px',
      fontSize: '0.875rem',
      lineHeight: '1.2',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      maxWidth: '200px',
      display: 'flex',
      alignItems: 'center',
    }),
    multiValueRemove: provided => ({
      ...provided,
      color: 'var(--theme-elevation-600)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      paddingLeft: '0',
      paddingRight: '0',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--theme-elevation-150)',
        color: 'var(--theme-elevation-800)',
      },
    }),
    groupHeading: provided => ({
      ...provided,
      backgroundColor: 'var(--theme-elevation-50)',
      color: 'var(--theme-elevation-600)',
      fontSize: '0.875rem',
      fontWeight: 600,
      padding: '8px 12px',
      textTransform: 'none',
      borderBottom: '1px solid var(--theme-elevation-200)',
    }),
    placeholder: provided => ({
      ...provided,
      color: 'var(--theme-elevation-400)',
    }),
    input: provided => ({
      ...provided,
      color: 'var(--theme-elevation-800)',
    }),
    singleValue: provided => ({
      ...provided,
      color: 'var(--theme-elevation-800)',
    }),
    indicatorSeparator: provided => ({
      ...provided,
      backgroundColor: 'var(--theme-elevation-200)',
    }),
    dropdownIndicator: provided => ({
      ...provided,
      color: 'var(--theme-elevation-600)',
    }),
    clearIndicator: provided => ({
      ...provided,
      color: 'var(--theme-elevation-600)',
    }),
  }

  const handleChange = (newValue: MultiValue<StructuredOption> | SingleValue<StructuredOption>) => {
    if (hasMany) {
      let values = newValue
        ? (newValue as MultiValue<StructuredOption>).map(option => option.value)
        : []

      // Clean up redundant permissions
      values = values.filter((val: string, index: number, self: string[]) => {
        // Remove duplicates
        if (self.indexOf(val) !== index) return false

        // If super admin (*) is selected, remove all other permissions
        if (self.includes('*') && val !== '*') return false

        // If collection wildcard is selected, remove individual operations
        const valParts = val.split('.')
        if (valParts.length === 2) {
          const collection = valParts[0]
          const operation = valParts[1]

          // Check if wildcard exists for this collection
          if (operation !== '*' && self.includes(`${collection}.*`)) {
            return false
          }
        }

        return true
      })

      setValue(values)
    } else {
      setValue(newValue ? (newValue as StructuredOption).value : null)
    }
  }

  // Find selected options from current value
  const selectedOptions = useMemo(() => {
    if (!value) return hasMany ? [] : null

    const flatOptions = options.flatMap(group => group.options)

    if (hasMany && Array.isArray(value)) {
      return flatOptions.filter(option => value.includes(option.value))
    } else if (!hasMany && typeof value === 'string') {
      return flatOptions.find(option => option.value === value) || null
    }

    return hasMany ? [] : null
  }, [value, options, hasMany])

  return (
    <div style={inlineStyles.wrapper}>
      {label && (
        <label style={inlineStyles.label}>
          {label}
          {required && <span style={inlineStyles.required}>*</span>}
        </label>
      )}
      {admin?.description && <p style={inlineStyles.description}>{admin.description}</p>}
      <Select
        instanceId={selectId}
        isMulti={hasMany as never}
        value={selectedOptions}
        onChange={handleChange as never}
        options={options}
        components={{
          Option: CustomOption,
          MultiValue: CustomMultiValue,
          MultiValueRemove: CustomMultiValueRemove,
          GroupHeading: CustomGroupHeading,
          ClearIndicator: CustomClearIndicator,
          DropdownIndicator: CustomDropdownIndicator,
        }}
        styles={customStyles}
        placeholder="Select permissions..."
        isClearable={!readOnly}
        isSearchable={!readOnly}
        isDisabled={readOnly}
        closeMenuOnSelect={false}
        blurInputOnSelect={false}
        name={name}
      />
    </div>
  )
}
