const pageMessage = document.querySelector('#page-message');
const dashboardContent = document.querySelector('#dashboard-content');
const pendingBody = document.querySelector('#pending-body');
const usersBody = document.querySelector('#users-body');
const filterForm = document.querySelector('#filter-form');
const searchInput = document.querySelector('#search');
const statusFilter = document.querySelector('#status-filter');
const roleFilter = document.querySelector('#role-filter');

let currentPage = 1;
let totalPages = 1;
let pendingPage = 1;
let pendingTotalPages = 1;
let filters = { search: '', status: '', role: '' };

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function showMessage(message, state = 'error') {
  pageMessage.textContent = message;
  pageMessage.dataset.state = state;
}

function actionButton(label, action, danger = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = danger ? 'button-secondary button-danger' : 'button-secondary';
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

function addEmptyRow(body, columns, message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columns;
  cell.textContent = message;
  row.append(cell);
  body.append(row);
}

function appendUserActions(actions, user) {
  if (user.status === 'pending') {
    actions.append(actionButton('Approve', 'approve'), actionButton('Reject', 'reject', true));
    return;
  }
  if (user.status === 'rejected') {
    return;
  }
  if (user.role === 'user') {
    actions.append(actionButton('Promote to Admin', 'promote'));
  } else if (user.role === 'admin') {
    actions.append(actionButton('Demote to User', 'demote'));
  }
  if (user.status === 'active') {
    actions.append(
      actionButton('Block', 'block', true),
      actionButton('Disable', 'disable', true),
    );
  } else if (user.status === 'blocked') {
    actions.append(actionButton('Unblock', 'unblock'));
  } else if (user.status === 'disabled') {
    actions.append(actionButton('Enable', 'enable'));
  }
}

function renderUsers(body, users, columns) {
  body.replaceChildren();
  if (!users.length) {
    addEmptyRow(body, columns, 'No accounts found.');
    return;
  }
  for (const user of users) {
    const row = document.createElement('tr');
    row.dataset.userId = user.id;
    for (const text of [`${user.firstName} ${user.lastName}`, user.email]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }
    if (columns === 5) {
      const roleCell = document.createElement('td');
      roleCell.textContent = user.role;
      row.append(roleCell);
    } else {
      const dateCell = document.createElement('td');
      dateCell.textContent = new Date(user.createdAt).toLocaleString();
      row.append(dateCell);
    }
    if (columns === 5) {
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.dataset.status = user.status;
      badge.textContent = user.status;
      statusCell.append(badge);
      row.append(statusCell);
    }
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'user-actions';
    appendUserActions(actions, user);
    actionsCell.append(actions);
    row.append(actionsCell);
    body.append(row);
  }
}

async function loadSummary() {
  const { summary } = await apiRequest('/api/superadmin/summary');
  document.querySelector('#summary-total').textContent = summary.totalUsers;
  document.querySelector('#summary-pending').textContent = summary.pendingUsers;
  document.querySelector('#summary-admins').textContent = summary.activeAdmins;
  document.querySelector('#summary-superadmins').textContent = summary.activeSuperadmins;
  document.querySelector('#summary-restricted').textContent = summary.blockedUsers + summary.disabledUsers;
}

async function loadUsers() {
  const params = new URLSearchParams({ page: String(currentPage), pageSize: '20' });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const result = await apiRequest(`/api/superadmin/users?${params}`);
  renderUsers(usersBody, result.users, 5);
  totalPages = Math.max(1, result.pagination.totalPages);
  document.querySelector('#account-count').textContent = `${result.pagination.total} account${result.pagination.total === 1 ? '' : 's'} found.`;
  document.querySelector('#page-label').textContent = `Page ${result.pagination.page} of ${totalPages}`;
  document.querySelector('#previous-page').disabled = currentPage <= 1;
  document.querySelector('#next-page').disabled = currentPage >= totalPages;
}

async function loadPending() {
  const params = new URLSearchParams({ page: String(pendingPage), pageSize: '20' });
  const result = await apiRequest(`/api/superadmin/pending?${params}`);
  renderUsers(pendingBody, result.users, 4);
  pendingTotalPages = Math.max(1, result.pagination.totalPages);
  document.querySelector('#pending-count').textContent = `${result.pagination.total} registration${result.pagination.total === 1 ? '' : 's'} awaiting review.`;
  document.querySelector('#pending-page-label').textContent = `Page ${result.pagination.page} of ${pendingTotalPages}`;
  document.querySelector('#pending-previous').disabled = pendingPage <= 1;
  document.querySelector('#pending-next').disabled = pendingPage >= pendingTotalPages;
}

async function refreshDashboard() {
  showMessage('');
  try {
    await Promise.all([loadSummary(), loadPending(), loadUsers()]);
    return true;
  } catch (error) {
    showMessage(error.message);
    return false;
  }
}

async function performAction(event) {
  const button = event.target.closest('button[data-action]');
  const row = event.target.closest('tr[data-user-id]');
  if (!button || !row) return;
  const { action } = button.dataset;
  const labels = {
    approve: 'approve this registration',
    reject: 'reject this registration',
    promote: 'promote this user to Admin',
    demote: 'demote this Admin to User',
    block: 'block this account',
    unblock: 'unblock this account',
    disable: 'disable this account',
    enable: 'enable this account',
  };
  if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) return;
  button.disabled = true;
  try {
    const result = await apiRequest(`/api/superadmin/users/${encodeURIComponent(row.dataset.userId)}/${action}`, {
      method: 'POST',
    });
    if (await refreshDashboard()) {
      showMessage(result.message, 'success');
    }
  } catch (error) {
    showMessage(error.message);
  } finally {
    button.disabled = false;
  }
}

filterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  filters = {
    search: searchInput.value.trim(),
    status: statusFilter.value,
    role: roleFilter.value,
  };
  currentPage = 1;
  void refreshDashboard();
});
usersBody.addEventListener('click', (event) => void performAction(event));
pendingBody.addEventListener('click', (event) => void performAction(event));
document.querySelector('#refresh-pending').addEventListener('click', () => void refreshDashboard());
document.querySelector('#previous-page').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    void loadUsers().catch((error) => showMessage(error.message));
  }
});
document.querySelector('#next-page').addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    void loadUsers().catch((error) => showMessage(error.message));
  }
});
document.querySelector('#pending-previous').addEventListener('click', () => {
  if (pendingPage > 1) {
    pendingPage -= 1;
    void loadPending().catch((error) => showMessage(error.message));
  }
});
document.querySelector('#pending-next').addEventListener('click', () => {
  if (pendingPage < pendingTotalPages) {
    pendingPage += 1;
    void loadPending().catch((error) => showMessage(error.message));
  }
});
document.querySelector('#logout-button').addEventListener('click', async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.assign('/register');
  }
});

async function initialize() {
  try {
    const { user } = await apiRequest('/api/auth/me');
    if (user.role !== 'superadmin') {
      showMessage('Access denied. Only Superadmin accounts can use this dashboard.');
      document.querySelector('#role-badge').textContent = 'Access denied';
      return;
    }
    document.querySelector('#role-badge').textContent = 'Superadmin';
    dashboardContent.hidden = false;
    await refreshDashboard();
  } catch (error) {
    document.querySelector('#role-badge').textContent = 'Not signed in';
    showMessage(error.status === 401 ? 'Please sign in to access the Superadmin dashboard.' : error.message);
  }
}

void initialize();
