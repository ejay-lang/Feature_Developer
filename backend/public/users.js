const pageMessage = document.querySelector('#page-message');
const content = document.querySelector('#management-content');
const roleBadge = document.querySelector('#role-badge');
const createForm = document.querySelector('#create-form');
const createRoleField = document.querySelector('#create-role-field');
const usersBody = document.querySelector('#users-body');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search');
const resultCount = document.querySelector('#result-count');
const pageLabel = document.querySelector('#page-label');
const previousButton = document.querySelector('#previous-page');
const nextButton = document.querySelector('#next-page');
const editDialog = document.querySelector('#edit-dialog');
const editForm = document.querySelector('#edit-form');
const editRoleField = document.querySelector('#edit-role-field');
const editMessage = document.querySelector('#edit-message');
const rightsDialog = document.querySelector('#rights-dialog');
const rightsForm = document.querySelector('#rights-form');
const rightsUserLabel = document.querySelector('#rights-user-label');
const permissionModules = document.querySelector('#permission-modules');
const rightsMessage = document.querySelector('#rights-message');
const saveRightsButton = document.querySelector('#save-rights');

let currentRole = '';
let currentPage = 1;
let totalPages = 1;
let searchTerm = '';
let rightsTargetId = '';
let rightsLoaded = false;

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
    error.code = body.error?.code;
    throw error;
  }

  return body;
}

function showMessage(text, state = 'error') {
  pageMessage.textContent = text;
  pageMessage.dataset.state = state;
}

function createActionButton(label, action, className = 'button-secondary') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

function renderUsers(users) {
  usersBody.replaceChildren();

  if (!users.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No users found.';
    row.append(cell);
    usersBody.append(row);
    return;
  }

  for (const user of users) {
    const row = document.createElement('tr');
    row.dataset.userId = user.id;
    const nameCell = document.createElement('td');
    nameCell.textContent = `${user.firstName} ${user.lastName}`;
    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;
    const roleCell = document.createElement('td');
    roleCell.textContent = user.role;
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'status-badge';
    badge.dataset.status = user.status;
    badge.textContent = user.status;
    statusCell.append(badge);
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'user-actions';
    actions.append(createActionButton('Edit', 'edit'));
    actions.append(createActionButton('Manage rights', 'rights'));
    if (user.status === 'active') {
      actions.append(createActionButton('Block', 'block', 'button-secondary button-danger'));
    } else if (user.status === 'blocked') {
      actions.append(createActionButton('Unblock', 'unblock'));
    }
    actionsCell.append(actions);
    row.append(nameCell, emailCell, roleCell, statusCell, actionsCell);
    usersBody.append(row);
  }
}

async function loadUsers() {
  showMessage('');
  const params = new URLSearchParams({
    page: String(currentPage),
    pageSize: '20',
  });
  if (searchTerm) {
    params.set('search', searchTerm);
  }

  try {
    const result = await apiRequest(`/api/users?${params}`);
    renderUsers(result.users);
    totalPages = Math.max(1, result.pagination.totalPages);
    resultCount.textContent = `${result.pagination.total} user${result.pagination.total === 1 ? '' : 's'} found.`;
    pageLabel.textContent = `Page ${result.pagination.page} of ${totalPages}`;
    previousButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  } catch (error) {
    if (error.status === 401) {
      showMessage('Please sign in to access user management.');
    } else if (error.status === 403) {
      showMessage('Access denied. Only Admin and Superadmin accounts can manage users.');
    } else {
      showMessage(error.message);
    }
  }
}

function populateEditForm(user) {
  editForm.elements.id.value = user.id;
  editForm.elements.firstName.value = user.firstName;
  editForm.elements.lastName.value = user.lastName;
  editForm.elements.email.value = user.email;
  editForm.elements.role.value = user.role;
  editRoleField.hidden = currentRole !== 'superadmin';
  editMessage.textContent = '';
  editDialog.showModal();
}

function renderPermissionModules(catalog, grantedCodes) {
  permissionModules.replaceChildren();
  const granted = new Set(grantedCodes);
  for (const module of catalog.modules) {
    const section = document.createElement('fieldset');
    section.className = 'permission-module';
    const legend = document.createElement('legend');
    legend.textContent = module.name;
    section.append(legend);
    for (const permission of module.permissions) {
      const label = document.createElement('label');
      label.className = 'permission-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'permission';
      checkbox.value = permission.code;
      checkbox.checked = granted.has(permission.code);
      const text = document.createElement('span');
      text.textContent = permission.action;
      label.append(checkbox, text);
      section.append(label);
    }
    permissionModules.append(section);
  }
}

async function openRightsDialog(user) {
  rightsTargetId = user.id;
  rightsLoaded = false;
  saveRightsButton.disabled = true;
  rightsUserLabel.textContent = `${user.firstName} ${user.lastName} (${user.email})`;
  rightsMessage.textContent = '';
  permissionModules.replaceChildren();
  rightsDialog.showModal();
  try {
    const [catalog, current] = await Promise.all([
      apiRequest('/api/rights/permissions'),
      apiRequest(`/api/rights/users/${encodeURIComponent(user.id)}/permissions`),
    ]);
    renderPermissionModules(catalog, current.permissions.map((permission) => permission.code));
    rightsLoaded = true;
    saveRightsButton.disabled = false;
  } catch (error) {
    rightsMessage.textContent = error.message;
  }
}

async function handleRowAction(event) {
  const button = event.target.closest('button[data-action]');
  const row = event.target.closest('tr[data-user-id]');
  if (!button || !row) {
    return;
  }

  const { userId } = row.dataset;
  const { action } = button.dataset;

  try {
    if (action === 'edit') {
      const result = await apiRequest(`/api/users/${encodeURIComponent(userId)}`);
      populateEditForm(result.user);
      return;
    }
    if (action === 'rights') {
      const result = await apiRequest(`/api/users/${encodeURIComponent(userId)}`);
      await openRightsDialog(result.user);
      return;
    }

    const operation = action === 'block' ? 'block' : 'unblock';
    const confirmed = window.confirm(`Are you sure you want to ${operation} this user?`);
    if (!confirmed) {
      return;
    }
    await apiRequest(`/api/users/${encodeURIComponent(userId)}/${operation}`, { method: 'POST' });
    showMessage(`User ${operation}ed successfully.`, 'success');
    await loadUsers();
  } catch (error) {
    showMessage(error.message);
  }
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!createForm.reportValidity()) {
    return;
  }

  const values = new FormData(createForm);
  const user = Object.fromEntries(values.entries());
  if (currentRole !== 'superadmin') {
    delete user.role;
  }

  try {
    const result = await apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    createForm.reset();
    showMessage(result.message, 'success');
    currentPage = 1;
    await loadUsers();
  } catch (error) {
    showMessage(error.message);
  }
});

document.querySelector('#select-all-permissions').addEventListener('click', () => {
  permissionModules.querySelectorAll('input[name="permission"]').forEach((input) => {
    input.checked = true;
  });
});
document.querySelector('#select-no-permissions').addEventListener('click', () => {
  permissionModules.querySelectorAll('input[name="permission"]').forEach((input) => {
    input.checked = false;
  });
});
rightsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rightsLoaded) {
    return;
  }
  saveRightsButton.disabled = true;
  rightsMessage.textContent = '';
  try {
    const permissions = [...permissionModules.querySelectorAll('input[name="permission"]:checked')]
      .map((input) => input.value);
    const result = await apiRequest(`/api/rights/users/${encodeURIComponent(rightsTargetId)}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
    rightsDialog.close();
    showMessage(result.message, 'success');
  } catch (error) {
    rightsMessage.textContent = error.message;
  } finally {
    saveRightsButton.disabled = false;
  }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!editForm.reportValidity()) {
    return;
  }

  const values = new FormData(editForm);
  const id = values.get('id');
  const user = {
    firstName: values.get('firstName'),
    lastName: values.get('lastName'),
    email: values.get('email'),
  };
  if (currentRole === 'superadmin') {
    user.role = values.get('role');
  }

  const saveButton = document.querySelector('#save-edit');
  saveButton.disabled = true;
  try {
    await apiRequest(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(user),
    });
    editDialog.close();
    showMessage('User updated.', 'success');
    await loadUsers();
  } catch (error) {
    editMessage.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchTerm = searchInput.value.trim();
  currentPage = 1;
  void loadUsers();
});

previousButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    void loadUsers();
  }
});

nextButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    void loadUsers();
  }
});

usersBody.addEventListener('click', (event) => {
  void handleRowAction(event);
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.assign('/register');
  }
});

document.querySelector('#close-dialog').addEventListener('click', () => editDialog.close());
document.querySelector('#cancel-edit').addEventListener('click', () => editDialog.close());
document.querySelector('#close-rights-dialog').addEventListener('click', () => rightsDialog.close());
document.querySelector('#cancel-rights').addEventListener('click', () => rightsDialog.close());

async function initialize() {
  try {
    const { user } = await apiRequest('/api/auth/me');
    if (!['admin', 'superadmin'].includes(user.role)) {
      showMessage('Access denied. Only Admin and Superadmin accounts can manage users.');
      roleBadge.textContent = 'Access denied';
      return;
    }
    currentRole = user.role;
    roleBadge.textContent = user.role;
    document.querySelector('#superadmin-link').hidden = user.role !== 'superadmin';
    createRoleField.hidden = user.role !== 'superadmin';
    content.hidden = false;
    await loadUsers();
  } catch (error) {
    roleBadge.textContent = 'Not signed in';
    showMessage(error.status === 401
      ? 'Please sign in to access user management.'
      : error.message);
  }
}

void initialize();
