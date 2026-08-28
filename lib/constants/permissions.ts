export interface ModuleDefinition {
  key: string
  name: string
  href: string
  description: string
  actions: {
    key: string
    name: string
    description: string
  }[]
}

export const ADMIN_MODULES: ModuleDefinition[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    href: '/admin/dashboard',
    description: 'Executive overview, key performance indicators and revenue stats.',
    actions: [{ key: 'view', name: 'View Dashboard', description: 'Can view summary metrics and graphs' }],
  },
  {
    key: 'campaigns',
    name: 'Campaigns',
    href: '/admin/campaigns',
    description: 'Brand campaigns, requirements, pricing, and campaign settings.',
    actions: [
      { key: 'view', name: 'View Campaigns', description: 'Can view campaigns list and details' },
      { key: 'create', name: 'Create Campaign', description: 'Can create new campaigns' },
      { key: 'edit', name: 'Edit Campaign', description: 'Can update campaign status, details, pricing' },
      { key: 'delete', name: 'Delete Campaign', description: 'Can delete campaigns' },
    ],
  },
  {
    key: 'applications',
    name: 'Applications',
    href: '/admin/applications',
    description: 'Influencer campaign applications, review workflow, and approvals.',
    actions: [
      { key: 'view', name: 'View Applications', description: 'Can view submitted applications' },
      { key: 'edit', name: 'Approve / Reject', description: 'Can update status, payouts, and notes' },
      { key: 'delete', name: 'Delete Application', description: 'Can remove applications' },
    ],
  },
  {
    key: 'order_details',
    name: 'Order Details',
    href: '/admin/order-details',
    description: 'Shipment tracking, order IDs, product delivery, and post links.',
    actions: [
      { key: 'view', name: 'View Orders', description: 'Can view order shipments and post proofs' },
      { key: 'edit', name: 'Update Orders', description: 'Can update tracking numbers and delivery statuses' },
      { key: 'delete', name: 'Delete Orders', description: 'Can remove order records' },
    ],
  },
  {
    key: 'payments',
    name: 'Payments',
    href: '/admin/payments',
    description: 'Influencer financial payouts, deal verification, and payment logs.',
    actions: [
      { key: 'view', name: 'View Payments', description: 'Can view financial transactions and ledgers' },
      { key: 'edit', name: 'Process Payments', description: 'Can mark payments as paid and update amounts' },
      { key: 'export', name: 'Export Ledger', description: 'Can download payout CSV summaries' },
    ],
  },
  {
    key: 'feedback',
    name: 'User Feedback',
    href: '/admin/feedback',
    description: 'Feedback and inquiries submitted by creators and partners.',
    actions: [
      { key: 'view', name: 'View Feedback', description: 'Can view user feedback submissions' },
      { key: 'edit', name: 'Resolve Feedback', description: 'Can mark issues as resolved or updated' },
    ],
  },
  {
    key: 'analytics',
    name: 'Analytics',
    href: '/admin/analytics',
    description: 'Platform metrics, demographic breakdowns, and engagement reports.',
    actions: [
      { key: 'view', name: 'View Analytics', description: 'Can view statistical dashboards and charts' },
      { key: 'export', name: 'Export Data', description: 'Can export reports' },
    ],
  },
  {
    key: 'import',
    name: 'Import Sync',
    href: '/admin/import',
    description: 'CSV bulk import and Google Sheets synchronization.',
    actions: [
      { key: 'view', name: 'View Import Tool', description: 'Can access the import preview tool' },
      { key: 'create', name: 'Run Sync/Import', description: 'Can execute CSV and Google Sheet imports' },
    ],
  },
  {
    key: 'influencers',
    name: 'Influencers',
    href: '/admin/influencers',
    description: 'Creator roster, profiles, bank details, and Instagram statistics.',
    actions: [
      { key: 'view', name: 'View Influencers', description: 'Can view creator directory and profiles' },
      { key: 'edit', name: 'Edit Influencer', description: 'Can update profile data and status' },
      { key: 'delete', name: 'Delete Influencer', description: 'Can remove influencer records' },
    ],
  },
  {
    key: 'staff',
    name: 'Employee Management',
    href: '/admin/staff',
    description: 'Admin and employee user management, role assignments, and password resets.',
    actions: [
      { key: 'view', name: 'View Employees', description: 'Can view employee directory' },
      { key: 'create', name: 'Create Employee', description: 'Can create new employee accounts' },
      { key: 'edit', name: 'Edit Employee', description: 'Can edit roles and custom permissions' },
      { key: 'reset_password', name: 'Reset Password', description: 'Can reset employee passwords directly' },
      { key: 'delete', name: 'Delete Employee', description: 'Can delete employee accounts' },
    ],
  },
  {
    key: 'roles',
    name: 'Roles & Permissions',
    href: '/admin/roles',
    description: 'Dynamic roles creation, permission presets, and access management.',
    actions: [
      { key: 'view', name: 'View Roles', description: 'Can view roles configuration' },
      { key: 'create', name: 'Create Role', description: 'Can create new custom roles' },
      { key: 'edit', name: 'Edit Role', description: 'Can update role permissions' },
      { key: 'delete', name: 'Delete Role', description: 'Can remove custom roles' },
    ],
  },
]
