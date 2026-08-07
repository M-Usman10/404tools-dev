export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const STRONG_PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, and a number."

export function getPasswordValidationError(password: string) {
  if (!STRONG_PASSWORD_REGEX.test(password)) {
    return STRONG_PASSWORD_MESSAGE
  }

  return null
}
