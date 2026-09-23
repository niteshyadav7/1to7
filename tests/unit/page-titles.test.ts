import { describe, it, expect } from 'vitest'
import { getRouteMeta, ADMIN_ROUTE_MAP, CREATOR_ROUTE_MAP } from '@/lib/utils/page-titles'

describe('Page Titles Utility', () => {
  it('correctly maps known admin routes to descriptive browser titles', () => {
    expect(getRouteMeta('/admin/campaigns').browserTitle).toBe('Campaigns | 1to7 Admin')
    expect(getRouteMeta('/admin/order-details').browserTitle).toBe('Order Details | 1to7 Admin')
    expect(getRouteMeta('/admin/applications').browserTitle).toBe('Applications | 1to7 Admin')
    expect(getRouteMeta('/admin/payments').browserTitle).toBe('Payment Desk | 1to7 Admin')
    expect(getRouteMeta('/admin/finance').browserTitle).toBe('Finance Payouts | 1to7 Admin')
    expect(getRouteMeta('/admin/dashboard').browserTitle).toBe('Dashboard | 1to7 Admin')
  })

  it('correctly maps known creator routes to descriptive browser titles', () => {
    expect(getRouteMeta('/dashboard').browserTitle).toBe('Dashboard | 1to7 Media')
    expect(getRouteMeta('/dashboard/campaigns').browserTitle).toBe('Applied Campaigns | 1to7 Media')
    expect(getRouteMeta('/dashboard/approved').browserTitle).toBe('Approved | 1to7 Media')
    expect(getRouteMeta('/login').browserTitle).toBe('Sign In | 1to7 Media')
  })

  it('handles dynamic sub-routes like campaign details and applications', () => {
    expect(getRouteMeta('/admin/campaigns/c123-abc').browserTitle).toBe('Campaign Details | 1to7 Admin')
    expect(getRouteMeta('/admin/applications/c123-abc').browserTitle).toBe('Campaign Applications | 1to7 Admin')
    expect(getRouteMeta('/admin/virtual-profile/u123').browserTitle).toBe('Influencer Profile | 1to7 Admin')
    expect(getRouteMeta('/admin/virtual-profile/u123/applied').browserTitle).toBe('Applied Campaigns | 1to7 Admin')
  })

  it('provides safe fallbacks for empty or unknown routes', () => {
    expect(getRouteMeta('')).toEqual({ title: '1to7 Media', browserTitle: '1to7 Media | Creator Portal' })
    expect(getRouteMeta('/admin/custom-feature').browserTitle).toBe('Custom Feature | 1to7 Admin')
  })
})
