import React from 'react'
import { render } from '@testing-library/react'
import { ProtectedRoleNotice } from '../../components/ProtectedRoleNotice'

describe('ProtectedRoleNotice Component', () => {
  it('should render the component', () => {
    const { container } = render(<ProtectedRoleNotice />)
    expect(container.firstChild).toBeDefined()
  })

  it('should display lock icon', () => {
    const { getByText } = render(<ProtectedRoleNotice />)
    const icon = getByText('🔒')
    expect(icon).toBeDefined()
    expect(icon.tagName.toLowerCase()).toBe('span')
  })

  it('should display protected role title', () => {
    const { getByText } = render(<ProtectedRoleNotice />)
    expect(getByText('Protected System Role')).toBeDefined()
  })

  it('should display description text', () => {
    const { getByText } = render(<ProtectedRoleNotice />)
    const description = getByText(/This is a protected system role/)
    expect(description).toBeDefined()
    expect(description.textContent).toContain("essential for the application'") // Will match the escaped apostrophe
    expect(description.textContent).toContain('You can customize its description and permissions')
  })

  it('should have correct container styling', () => {
    const { container } = render(<ProtectedRoleNotice />)
    const noticeDiv = container.firstChild as HTMLElement
    
    expect(noticeDiv).toBeDefined()
    expect(noticeDiv.style.backgroundColor).toBe('rgb(255, 247, 237)') // #fff7ed
    expect(noticeDiv.style.border).toBe('1px solid rgb(254, 215, 170)') // #fed7aa
    expect(noticeDiv.style.borderRadius).toBe('0.375rem')
    expect(noticeDiv.style.padding).toBe('12px 16px')
    expect(noticeDiv.style.marginBottom).toBe('20px')
    expect(noticeDiv.style.color).toBe('rgb(154, 52, 18)') // #9a3412
    expect(noticeDiv.style.display).toBe('flex')
    expect(noticeDiv.style.alignItems).toBe('flex-start')
    expect(noticeDiv.style.gap).toBe('8px')
  })

  it('should have correct icon styling', () => {
    const { getByText } = render(<ProtectedRoleNotice />)
    const icon = getByText('🔒') as HTMLElement
    
    expect(icon.style.fontSize).toBe('18px')
    expect(icon.style.lineHeight).toBe('1')
  })

  it('should have correct title styling', () => {
    const { getByText } = render(<ProtectedRoleNotice />)
    const title = getByText('Protected System Role')
    
    expect(title.tagName.toLowerCase()).toBe('strong')
  })

  it('should have correct description styling', () => {
    const { container } = render(<ProtectedRoleNotice />)
    const paragraph = container.querySelector('p') as HTMLElement
    
    expect(paragraph).toBeDefined()
    expect(paragraph.style.margin).toBe('4px 0px 0px')
    expect(paragraph.style.fontSize).toBe('14px')
    expect(paragraph.style.opacity).toBe('0.9')
  })

  it('should have correct structure with wrapper div', () => {
    const { container } = render(<ProtectedRoleNotice />)
    const wrapper = container.firstChild as HTMLElement
    
    expect(wrapper.children.length).toBe(2) // Icon span and content div
    
    const iconSpan = wrapper.children[0]
    expect(iconSpan.textContent).toBe('🔒')
    
    const contentDiv = wrapper.children[1] as HTMLElement
    expect(contentDiv.children.length).toBe(2) // Strong title and p description
    expect(contentDiv.children[0].tagName.toLowerCase()).toBe('strong')
    expect(contentDiv.children[1].tagName.toLowerCase()).toBe('p')
  })

  it('should export as default', async () => {
    // Test that the default export exists
    const module = await import('../../components/ProtectedRoleNotice')
    expect(module.default).toBe(ProtectedRoleNotice)
  })
})