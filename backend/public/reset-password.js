const form = document.querySelector('#reset-password-form');
const message = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-button');
const newPassword = document.querySelector('#newPassword');
const confirmPassword = document.querySelector('#confirmPassword');
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';

document.querySelector('#token').value = token;
window.history.replaceState(null, '', window.location.pathname);

if (!token) {
  message.textContent = 'This password reset link is invalid or has expired. Request a new link to continue.';
  submitButton.disabled = true;
}

function validatePasswordConfirmation() {
  confirmPassword.setCustomValidity(
    newPassword.value === confirmPassword.value ? '' : 'Passwords do not match.',
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  validatePasswordConfirmation();

  if (!token || !form.reportValidity()) {
    return;
  }

  message.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Resetting...';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.error?.message || 'Unable to reset the password.';
      if (response.status === 400 && result.error?.code === 'RESET_TOKEN_INVALID') {
        submitButton.disabled = true;
        submitButton.textContent = 'Request a new link';
      }
      return;
    }

    message.dataset.state = 'success';
    message.textContent = result.message;
    form.reset();
    submitButton.disabled = true;
    submitButton.textContent = 'Password updated';
  } catch {
    message.textContent = 'Unable to reach the server. Check your connection and try again.';
  } finally {
    if (!submitButton.disabled) {
      submitButton.textContent = 'Reset password';
    }
  }
});

newPassword.addEventListener('input', validatePasswordConfirmation);
confirmPassword.addEventListener('input', validatePasswordConfirmation);
