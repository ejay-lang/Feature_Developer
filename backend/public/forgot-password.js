const form = document.querySelector('#forgot-password-form');
const message = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  message.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.elements.email.value }),
    });
    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.error?.message || 'Unable to process this request.';
      return;
    }

    message.dataset.state = 'success';
    message.textContent = result.message;
    form.reset();
  } catch {
    message.textContent = 'Unable to reach the server. Check your connection and try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send reset link';
  }
});
