const form = document.querySelector('#registration-form');
const message = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-button');
const password = document.querySelector('#password');
const confirmPassword = document.querySelector('#confirmPassword');

function showMessage(text, state = 'error') {
  message.textContent = text;
  message.dataset.state = state;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  confirmPassword.setCustomValidity(
    password.value === confirmPassword.value ? '' : 'Passwords do not match.',
  );

  if (!form.reportValidity()) {
    return;
  }

  showMessage('');
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      const details = result.error && Array.isArray(result.error.details)
        ? result.error.details.map((item) => item.message).join(' ')
        : '';
      showMessage(details || (result.error && result.error.message) || 'Registration could not be completed.');
      return;
    }

    showMessage(result.message || 'Registration submitted.', 'success');
    form.reset();
  } catch {
    showMessage('Unable to reach the server. Check your connection and try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Create account';
  }
});

confirmPassword.addEventListener('input', () => {
  confirmPassword.setCustomValidity(
    password.value === confirmPassword.value ? '' : 'Passwords do not match.',
  );
});

password.addEventListener('input', () => {
  if (confirmPassword.value) {
    confirmPassword.setCustomValidity(
      password.value === confirmPassword.value ? '' : 'Passwords do not match.',
    );
  }
});
