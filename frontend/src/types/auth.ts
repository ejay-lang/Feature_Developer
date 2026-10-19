export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationField = keyof RegistrationInput;

export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export interface SignUpResult {
  confirmationRequired: boolean;
}

export type ProfileRole = 'user' | 'admin' | 'superadmin';

export type ProfileStatus =
  | 'pending'
  | 'active'
  | 'blocked'
  | 'disabled'
  | 'rejected';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}
