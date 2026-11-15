/**
 * bcrypt only uses the first 72 bytes of a password; anything longer would be
 * silently ignored, so new passwords are capped at that length.
 */
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_MIN_LENGTH = 8;

/** Upper bound for login input so huge payloads are rejected before hashing. */
export const LOGIN_PASSWORD_MAX_LENGTH = 1024;
