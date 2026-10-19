const loginForm = document.querySelector('#login-form');
const changePasswordForm = document.querySelector('#change-password-form');
const loginMessage = document.querySelector('#login-message');
const changeMessage = document.querySelector('#change-message');
const pageTitle = document.querySelector('#page-title');
const pageIntro = document.querySelector('#page-intro');
const routeRequiresPasswordChange = window.location.pathname === '/change-password';

function setMessage(element, text, state = 'error') {
  element.textContent = text;
  element.dataset.state = state;
}

function showPasswordChange(currentPassword = '') {
  loginForm.hidden = true;
  changePasswordForm.hidden = false;
  pageTitle.textContent = 'Update your password';
  pageIntro.textContent = 'Choose a new password to finish signing in.';
  if (currentPassword) {
    changePasswordForm.elements.currentPassword.value = currentPassword;
  }
  changePasswordForm.elements.newPassword.focus();
}

async function apiRequest(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error?.message || 'The request could not be completed.');
  }
  return result;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#login-button');
  button.disabled = true;
  setMessage(loginMessage, '');
  const password = loginForm.elements.password.value;
  try {
    const result = await apiRequest('/api/auth/login', {
      email: loginForm.elements.email.value,
      password,
    });
    if (result.user.mustChangePassword) {
      showPasswordChange(password);
      return;
    }
    window.location.assign('/dashboard');
  } catch (error) {
    setMessage(loginMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

changePasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#change-button');
  button.disabled = true;
  setMessage(changeMessage, '');
  try {
    await apiRequest('/api/auth/change-password', {
      currentPassword: changePasswordForm.elements.currentPassword.value,
      newPassword: changePasswordForm.elements.newPassword.value,
      confirmPassword: changePasswordForm.elements.confirmPassword.value,
    });
    window.location.assign('/dashboard');
  } catch (error) {
    setMessage(changeMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

if (routeRequiresPasswordChange) {
  showPasswordChange();
} else {
  fetch('/api/auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (response.status === 401) return;
      if (!response.ok) throw new Error('Could not verify the current session.');
      const result = await response.json();
      if (result.user.mustChangePassword) {
        showPasswordChange();
      } else {
        window.location.replace('/dashboard');
      }
    })
    .catch((error) => setMessage(loginMessage, error.message));
}
