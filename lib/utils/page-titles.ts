export interface RouteMeta {
  title: string
  browserTitle: string
  moduleKey?: string
  iconName?: string
}

export const ADMIN_ROUTE_MAP: Record<string, RouteMeta> = {
  '/admin/dashboard': {
    title: 'Dashboard',
    browserTitle: 'Dashboard | 1to7 Admin',
    moduleKey: 'dashboard',
    iconName: 'LayoutDashboard',
  },
  '/admin/campaigns': {
    title: 'Campaigns',
    browserTitle: 'Campaigns | 1to7 Admin',
    moduleKey: 'campaigns',
    iconName: 'Megaphone',
  },
  '/admin/campaigns/create': {
    title: 'Create Campaign',
    browserTitle: 'Create Campaign | 1to7 Admin',
    moduleKey: 'campaigns',
    iconName: 'Megaphone',
  },
  '/admin/applications': {
    title: 'Applications',
    browserTitle: 'Applications | 1to7 Admin',
    moduleKey: 'applications',
    iconName: 'Users',
  },
  '/admin/order-details': {
    title: 'Order Details',
    browserTitle: 'Order Details | 1to7 Admin',
    moduleKey: 'order_details',
    iconName: 'ClipboardList',
  },
  '/admin/completion-details': {
    title: 'Completion Details',
    browserTitle: 'Completion Details | 1to7 Admin',
    moduleKey: 'applications',
    iconName: 'FileCheck',
  },
  '/admin/payments': {
    title: 'Payment Desk',
    browserTitle: 'Payment Desk | 1to7 Admin',
    moduleKey: 'payments',
    iconName: 'CreditCard',
  },
  '/admin/finance': {
    title: 'Finance Payouts',
    browserTitle: 'Finance Payouts | 1to7 Admin',
    moduleKey: 'payments',
    iconName: 'IndianRupee',
  },
  '/admin/feedback': {
    title: 'User Feedback',
    browserTitle: 'User Feedback | 1to7 Admin',
    moduleKey: 'feedback',
    iconName: 'MessageSquareHeart',
  },
  '/admin/user-issues': {
    title: 'User Issues',
    browserTitle: 'User Issues | 1to7 Admin',
    moduleKey: 'user_issues',
    iconName: 'AlertTriangle',
  },
  '/admin/analytics': {
    title: 'Analytics',
    browserTitle: 'Analytics | 1to7 Admin',
    moduleKey: 'analytics',
    iconName: 'BarChart3',
  },
  '/admin/import': {
    title: 'Import Sync',
    browserTitle: 'Import Sync | 1to7 Admin',
    moduleKey: 'import',
    iconName: 'FileUp',
  },
  '/admin/influencers': {
    title: 'Influencers',
    browserTitle: 'Influencers | 1to7 Admin',
    moduleKey: 'influencers',
    iconName: 'Users',
  },
  '/admin/categories': {
    title: 'Categories & Niches',
    browserTitle: 'Categories | 1to7 Admin',
    moduleKey: 'influencers',
    iconName: 'Tags',
  },
  '/admin/staff': {
    title: 'Employee Management',
    browserTitle: 'Staff | 1to7 Admin',
    moduleKey: 'staff',
    iconName: 'UserCheck',
  },
  '/admin/roles': {
    title: 'Roles & Access',
    browserTitle: 'Roles & Access | 1to7 Admin',
    moduleKey: 'roles',
    iconName: 'Sliders',
  },
  '/admin/requests': {
    title: 'Requests Desk',
    browserTitle: 'Requests | 1to7 Admin',
    moduleKey: 'payments',
    iconName: 'CreditCard',
  },
  '/admin': {
    title: 'Admin Sign In',
    browserTitle: 'Admin Sign In | 1to7 Admin',
    iconName: 'ShieldCheck',
  },
}

export const CREATOR_ROUTE_MAP: Record<string, RouteMeta> = {
  '/dashboard': {
    title: 'Overview',
    browserTitle: 'Dashboard | 1to7 Media',
    iconName: 'LayoutDashboard',
  },
  '/dashboard/campaigns': {
    title: 'Applied Campaigns',
    browserTitle: 'Applied Campaigns | 1to7 Media',
    iconName: 'Send',
  },
  '/dashboard/approved': {
    title: 'Approved Collaborations',
    browserTitle: 'Approved | 1to7 Media',
    iconName: 'CheckCircle2',
  },
  '/dashboard/profile': {
    title: 'My Profile',
    browserTitle: 'Profile | 1to7 Media',
    iconName: 'User',
  },
  '/dashboard/feedback': {
    title: 'Feedback',
    browserTitle: 'Feedback | 1to7 Media',
    iconName: 'MessageSquareHeart',
  },
  '/login': {
    title: 'Creator Sign In',
    browserTitle: 'Sign In | 1to7 Media',
    iconName: 'User',
  },
  '/signup': {
    title: 'Creator Sign Up',
    browserTitle: 'Join as Creator | 1to7 Media',
    iconName: 'User',
  },
  '/forgot-password': {
    title: 'Reset Password',
    browserTitle: 'Reset Password | 1to7 Media',
  },
  '/report-issue': {
    title: 'Report Issue',
    browserTitle: 'Report Issue | 1to7 Media',
  },
  '/privacy': {
    title: 'Privacy Policy',
    browserTitle: 'Privacy Policy | 1to7 Media',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    browserTitle: 'Privacy Policy | 1to7 Media',
  },
}

/**
 * Resolves a clean display title and browser title for any application pathname
 */
export function getRouteMeta(pathname: string): RouteMeta {
  if (!pathname) {
    return { title: '1to7 Media', browserTitle: '1to7 Media | Creator Portal' }
  }

  // Exact match first
  if (ADMIN_ROUTE_MAP[pathname]) {
    return ADMIN_ROUTE_MAP[pathname]
  }
  if (CREATOR_ROUTE_MAP[pathname]) {
    return CREATOR_ROUTE_MAP[pathname]
  }

  // Admin dynamic sub-routes
  if (pathname.startsWith('/admin/campaigns/') && pathname !== '/admin/campaigns/create') {
    return {
      title: 'Campaign Details',
      browserTitle: 'Campaign Details | 1to7 Admin',
      moduleKey: 'campaigns',
      iconName: 'Megaphone',
    }
  }

  if (pathname.startsWith('/admin/applications/')) {
    return {
      title: 'Campaign Applications',
      browserTitle: 'Campaign Applications | 1to7 Admin',
      moduleKey: 'applications',
      iconName: 'Users',
    }
  }

  if (pathname.startsWith('/admin/virtual-profile/')) {
    if (pathname.endsWith('/applied')) {
      return { title: 'Applied (Creator)', browserTitle: 'Applied Campaigns | 1to7 Admin', iconName: 'Send' }
    }
    if (pathname.endsWith('/approved')) {
      return { title: 'Approved (Creator)', browserTitle: 'Approved Campaigns | 1to7 Admin', iconName: 'CheckCircle2' }
    }
    if (pathname.endsWith('/feedback')) {
      return { title: 'Feedback (Creator)', browserTitle: 'Feedback | 1to7 Admin', iconName: 'MessageSquareHeart' }
    }
    if (pathname.endsWith('/profile')) {
      return { title: 'Profile Details', browserTitle: 'Influencer Profile | 1to7 Admin', iconName: 'User' }
    }
    return {
      title: 'Creator Profile',
      browserTitle: 'Influencer Profile | 1to7 Admin',
      moduleKey: 'influencers',
      iconName: 'User',
    }
  }

  // Fallback for any other /admin routes
  if (pathname.startsWith('/admin/')) {
    const segment = pathname.split('/')[2] || 'Admin'
    const formatted = segment
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
    return {
      title: formatted,
      browserTitle: `${formatted} | 1to7 Admin`,
    }
  }

  // Fallback for creator / public routes
  if (pathname.startsWith('/dashboard/')) {
    const segment = pathname.split('/')[2] || 'Dashboard'
    const formatted = segment
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
    return {
      title: formatted,
      browserTitle: `${formatted} | 1to7 Media`,
    }
  }

  return { title: '1to7 Media', browserTitle: '1to7 Media | Creator Portal' }
}
