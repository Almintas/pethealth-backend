/**
 * bcrypt only uses the first 72 bytes of a password; anything longer would be
 * silently ignored, so new passwords are capped at that length.
 */
export const PASSWORD_MAX_LENGTH = 72;
