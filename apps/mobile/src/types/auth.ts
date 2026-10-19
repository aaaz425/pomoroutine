export interface AuthActionResult {
  error?: string;
  pendingConfirmation?: true;
}

export {
  LoginCredentialsSchema,
  SignupCredentialsSchema,
  ForgotPasswordSchema,
} from '@pomoroutine/shared';
