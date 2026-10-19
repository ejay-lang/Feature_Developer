import type { AuthError } from '@supabase/supabase-js';
import type { RegistrationInput, SignUpResult } from '../types/auth';
import { getSupabaseClient } from '../lib/supabase';

function getSignupErrorMessage(error: AuthError): string {
  if (error.status === 429) {
    return 'Too many signup attempts. Please wait a few minutes and try again.';
  }

  if (error.code === 'weak_password') {
    return 'Choose a stronger password and try again.';
  }

  if (error.code === 'validation_failed' || error.status === 400) {
    return 'The signup details could not be accepted. Check the fields and try again.';
  }

  return 'We could not submit your registration. Please try again later.';
}

export async function registerUser(
  input: RegistrationInput,
): Promise<SignUpResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo:
        import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
      },
    },
  });

  if (error) {
    throw new Error(getSignupErrorMessage(error));
  }

  return {
    confirmationRequired: data.session === null,
  };
}
