const dashboardModel = require('./dashboard.model');

const DOMAIN_MODULES = [
  {
    key: 'customer',
    name: 'Customer',
    description: 'Customer records and relationships',
    href: '/modules/customer',
  },
  {
    key: 'product',
    name: 'Product',
    description: 'Product catalog and information',
    href: '/modules/product',
  },
  {
    key: 'human_resources',
    name: 'Human Resources',
    description: 'People and workforce operations',
    href: '/modules/human_resources',
  },
  {
    key: 'sales',
    name: 'Sales',
    description: 'Sales activity and transactions',
    href: '/modules/sales',
  },
  {
    key: 'reports',
    name: 'Reports',
    description: 'Operational and business reports',
    href: '/modules/reports',
  },
];

const MANAGEMENT_MODULES = [
  {
    key: 'user_management',
    name: 'User Management',
    description: 'Manage user accounts and access',
    href: '/user-management',
    roles: ['admin', 'superadmin'],
  },
  {
    key: 'rights_management',
    name: 'Rights Management',
    description: 'Assign module permissions to users',
    href: '/rights-management',
    roles: ['admin', 'superadmin'],
  },
  {
    key: 'superadmin_management',
    name: 'Superadmin Management',
    description: 'Review registrations and manage elevated access',
    href: '/superadmin',
    roles: ['superadmin'],
  },
];

async function getDashboard(user) {
  const viewableKeys = user.role === 'superadmin'
    ? DOMAIN_MODULES.map((module) => module.key)
    : await dashboardModel.listViewableModuleKeys(user.id);
  const modules = [
    ...DOMAIN_MODULES.filter((module) => viewableKeys.includes(module.key)),
    ...MANAGEMENT_MODULES.filter((module) => module.roles.includes(user.role))
      .map(({ roles, ...module }) => module),
  ];

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    modules,
  };
}

module.exports = { getDashboard };
