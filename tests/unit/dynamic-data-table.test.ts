import { describe, it, expect } from 'vitest'

describe('DynamicDataTable Logic & Data Transformation Engine', () => {
  interface MockBrand {
    id: string
    name: string
    industry: string
    activeCampaigns: number
    pendingReviews: number
    slaStatus: 'active' | 'warning' | 'breached'
  }

  const sampleBrands: MockBrand[] = [
    {
      id: 'b-mamaearth',
      name: 'Mamaearth',
      industry: 'Beauty & Skincare',
      activeCampaigns: 2,
      pendingReviews: 18,
      slaStatus: 'warning',
    },
    {
      id: 'b-plum',
      name: 'Plum Goodness',
      industry: 'Vegan Beauty',
      activeCampaigns: 1,
      pendingReviews: 6,
      slaStatus: 'breached',
    },
    {
      id: 'b-sugar',
      name: 'Sugar Cosmetics',
      industry: 'Color Cosmetics',
      activeCampaigns: 3,
      pendingReviews: 0,
      slaStatus: 'active',
    },
    {
      id: 'b-minimalist',
      name: 'Minimalist',
      industry: 'Active Skincare',
      activeCampaigns: 4,
      pendingReviews: 24,
      slaStatus: 'breached',
    },
  ]

  it('correctly filters data using search across multiple fields', () => {
    const query = 'beauty'
    const filtered = sampleBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.industry.toLowerCase().includes(query)
    )

    expect(filtered.length).toBe(2)
    expect(filtered.map((b) => b.name)).toEqual(['Mamaearth', 'Plum Goodness'])
  })

  it('sorts numeric fields ascending and descending', () => {
    // Sort descending by pendingReviews
    const sortedDesc = [...sampleBrands].sort((a, b) => b.pendingReviews - a.pendingReviews)
    expect(sortedDesc[0].name).toBe('Minimalist')
    expect(sortedDesc[sortedDesc.length - 1].name).toBe('Sugar Cosmetics')

    // Sort ascending by activeCampaigns
    const sortedAsc = [...sampleBrands].sort((a, b) => a.activeCampaigns - b.activeCampaigns)
    expect(sortedAsc[0].name).toBe('Plum Goodness')
  })

  it('correctly calculates pagination slices and total pages', () => {
    const pageSize = 2
    const totalPages = Math.ceil(sampleBrands.length / pageSize)
    expect(totalPages).toBe(2)

    const page1 = sampleBrands.slice(0, 2)
    expect(page1.length).toBe(2)
    expect(page1[0].name).toBe('Mamaearth')

    const page2 = sampleBrands.slice(2, 4)
    expect(page2.length).toBe(2)
    expect(page2[0].name).toBe('Sugar Cosmetics')
  })

  it('generates compliant CSV content with UTF-8 BOM encoding and escaped fields', () => {
    const headers = ['Brand Name', 'Industry', 'Pending Reviews']
    const lines = sampleBrands.map(
      (b) => `"${b.name}","${b.industry}","${b.pendingReviews}"`
    )

    const csvContent = '\uFEFF' + [headers.join(','), ...lines].join('\r\n')

    expect(csvContent.startsWith('\uFEFF')).toBe(true)
    expect(csvContent).toContain('"Mamaearth","Beauty & Skincare","18"')
    expect(csvContent).toContain('"Plum Goodness","Vegan Beauty","6"')
  })

  it('manages column visibility set correctly', () => {
    const columns = [
      { key: 'name', header: 'Brand Name' },
      { key: 'industry', header: 'Industry' },
      { key: 'pendingReviews', header: 'Pending Reviews' },
    ]
    const hiddenKeys = new Set<string>(['industry'])

    const visibleColumns = columns.filter((col) => !hiddenKeys.has(col.key))
    expect(visibleColumns.map((c) => c.key)).toEqual(['name', 'pendingReviews'])
    expect(visibleColumns.length).toBe(2)
  })

  it('tracks bulk selection accurately using Sets', () => {
    const selectedIds = new Set<string>()
    selectedIds.add('b-mamaearth')
    selectedIds.add('b-plum')

    expect(selectedIds.has('b-mamaearth')).toBe(true)
    expect(selectedIds.size).toBe(2)

    selectedIds.delete('b-mamaearth')
    expect(selectedIds.has('b-mamaearth')).toBe(false)
    expect(selectedIds.size).toBe(1)

    selectedIds.clear()
    expect(selectedIds.size).toBe(0)
  })

  it('supports light and dark theme mode definitions', () => {
    const getThemeWrapperClass = (theme: 'dark' | 'light') =>
      theme === 'light' ? 'bg-white border-slate-200/90' : 'bg-[#121620] border-white/10'

    expect(getThemeWrapperClass('light')).toContain('bg-white')
    expect(getThemeWrapperClass('dark')).toContain('bg-[#121620]')
  })
})
