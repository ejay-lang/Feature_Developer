const moduleGrid = document.querySelector('#module-grid');
const sidebarModules = document.querySelector('#sidebar-modules');
const pageMessage = document.querySelector('#page-message');
const logoutButton = document.querySelector('#logout-button');
const menuToggle = document.querySelector('#menu-toggle');
const sidebar = document.querySelector('#sidebar');
const sidebarBackdrop = document.querySelector('#sidebar-backdrop');

const MODULE_ICONS = {
  customer: '♙',
  product: '▦',
  human_resources: '♧',
  sales: '↗',
  reports: '▤',
  user_management: '♧',
  rights_management: '⚿',
  superadmin_management: '◆',
};

function showMessage(message, state = 'error') {
  pageMessage.textContent = message;
  pageMessage.dataset.state = state;
}

function makeModuleLink(module, className) {
  const link = document.createElement('a');
  link.className = className;
  link.href = module.href;

  const icon = document.createElement('span');
  icon.className = 'module-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = MODULE_ICONS[module.key] || '•';

  const label = document.createElement('span');
  label.textContent = module.name;
  link.append(icon, label);
  return link;
}

function renderModules(modules) {
  moduleGrid.replaceChildren();
  sidebarModules.replaceChildren();
  for (const module of modules) {
    const card = makeModuleLink(module, 'module-card');
    const description = document.createElement('span');
    description.className = 'module-description';
    description.textContent = module.description;
    const arrow = document.createElement('span');
    arrow.className = 'module-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    card.append(description, arrow);
    moduleGrid.append(card);
    sidebarModules.append(makeModuleLink(module, 'nav-link'));
  }
  document.querySelector('#module-count').textContent = `${modules.length} available`;
  if (!modules.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No modules are currently assigned to your account.';
    moduleGrid.append(empty);
  }
}

async function loadDashboard() {
  try {
    const response = await fetch('/api/dashboard', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }
    if (!response.ok) {
      if (result.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
        window.location.assign('/change-password');
        return;
      }
      throw new Error(result.error?.message || 'Dashboard could not be loaded.');
    }

    const { user, modules } = result;
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    document.querySelector('#profile-name').textContent = fullName;
    document.querySelector('#profile-role').textContent = user.role;
    document.querySelector('#profile-avatar').textContent = (user.firstName || 'H').charAt(0).toUpperCase();
    document.querySelector('#welcome-title').textContent = `Welcome back, ${user.firstName}`;
    document.querySelector('#account-email').textContent = user.email;
    document.querySelector('#today-label').textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
    renderModules(modules);
  } catch (error) {
    showMessage(error.message);
  }
}

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error?.message || 'Could not end this session.');
    }
    window.location.assign('/login');
  } catch (error) {
    showMessage(error.message);
    logoutButton.disabled = false;
  }
});

function closeSidebar() {
  sidebar.classList.remove('is-open');
  sidebarBackdrop.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('is-open');
  sidebarBackdrop.hidden = !isOpen;
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
sidebarBackdrop.addEventListener('click', closeSidebar);
sidebar.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeSidebar();
});

loadDashboard();
