import { useState, type FormEvent } from 'react';
import { registerUser } from '../services/authService';
import type {
  RegistrationErrors,
  RegistrationField,
  RegistrationInput,
  SignUpResult,
} from '../types/auth';

const INITIAL_VALUES: RegistrationInput = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function validateRegistration(values: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const email = values.email.trim();

  if (!firstName) {
    errors.firstName = 'Enter your first name.';
  } else if (firstName.length > 100) {
    errors.firstName = 'First name must be 100 characters or fewer.';
  }

  if (!lastName) {
    errors.lastName = 'Enter your last name.';
  } else if (lastName.length > 100) {
    errors.lastName = 'Last name must be 100 characters or fewer.';
  }

  if (!email) {
    errors.email = 'Enter your email address.';
  } else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if ([...values.password].length < 12) {
    errors.password = 'Password must be at least 12 characters.';
  } else if (new TextEncoder().encode(values.password).length > 72) {
    errors.password = 'Password must not exceed 72 UTF-8 bytes.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export default function RegisterForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(true);

  function updateField(field: RegistrationField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError('');
    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);

    const firstInvalidField = Object.keys(validationErrors)[0] as
      | RegistrationField
      | undefined;
    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result: SignUpResult = await registerUser(values);
      setConfirmationRequired(result.confirmationRequired);
      setSubmitted(true);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'We could not submit your registration. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section
        className="confirmation-card"
        aria-labelledby="confirmation-title"
        aria-live="polite"
        role="status"
      >
        <div className="success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">REQUEST RECEIVED</p>
        <h1 id="confirmation-title">
          {confirmationRequired ? 'Check your email' : 'Request received'}
        </h1>
        <p className="intro">
          {confirmationRequired
            ? 'If the address can be registered, Supabase will send an email confirmation link. Your HOPE System profile is created with pending access and must be approved before you can use protected services.'
            : 'Your HOPE System profile has been created with pending access. It must be approved before you can use protected services.'}
        </p>
        <a className="text-link" href="/">
          Return to registration
        </a>
      </section>
    );
  }

  return (
    <form
      id="register-form"
      className="register-form"
      onSubmit={handleSubmit}
      noValidate
      aria-describedby="form-guidance"
    >
      <p id="form-guidance" className="form-guidance">
        All fields are required. Your account will remain pending until it is
        approved.
      </p>

      {requestError && (
        <div className="form-alert" role="alert">
          {requestError}
        </div>
      )}

      <div className="name-fields">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input
            autoComplete="given-name"
            id="firstName"
            maxLength={100}
            name="firstName"
            onChange={(event) => updateField('firstName', event.target.value)}
            required
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            aria-invalid={Boolean(errors.firstName)}
            value={values.firstName}
          />
          {errors.firstName && (
            <span className="field-error" id="firstName-error">
              {errors.firstName}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input
            autoComplete="family-name"
            id="lastName"
            maxLength={100}
            name="lastName"
            onChange={(event) => updateField('lastName', event.target.value)}
            required
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            aria-invalid={Boolean(errors.lastName)}
            value={values.lastName}
          />
          {errors.lastName && (
            <span className="field-error" id="lastName-error">
              {errors.lastName}
            </span>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          autoComplete="email"
          id="email"
          maxLength={254}
          name="email"
          onChange={(event) => updateField('email', event.target.value)}
          required
          type="email"
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          value={values.email}
        />
        {errors.email && (
          <span className="field-error" id="email-error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          autoComplete="new-password"
          id="password"
          maxLength={72}
          minLength={12}
          name="password"
          onChange={(event) => updateField('password', event.target.value)}
          required
          type="password"
          aria-describedby={`password-help${errors.password ? ' password-error' : ''}`}
          aria-invalid={Boolean(errors.password)}
          value={values.password}
        />
        <small id="password-help">
          Use at least 12 characters. Maximum length is 72 UTF-8 bytes.
        </small>
        {errors.password && (
          <span className="field-error" id="password-error">
            {errors.password}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          autoComplete="new-password"
          id="confirmPassword"
          maxLength={72}
          minLength={12}
          name="confirmPassword"
          onChange={(event) =>
            updateField('confirmPassword', event.target.value)
          }
          required
          type="password"
          aria-describedby={
            errors.confirmPassword ? 'confirmPassword-error' : undefined
          }
          aria-invalid={Boolean(errors.confirmPassword)}
          value={values.confirmPassword}
        />
        {errors.confirmPassword && (
          <span className="field-error" id="confirmPassword-error">
            {errors.confirmPassword}
          </span>
        )}
      </div>

      <p className="privacy-note">
        Your role and pending status are assigned securely by the database. They
        cannot be selected in this form.
      </p>
      <button className="submit-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Submitting request…' : 'Create account'}
      </button>
    </form>
  );
}
