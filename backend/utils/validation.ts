/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Password validation with detailed error messages
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain number (0-9)');
  }
  if (!/[@#$%^&*!]/.test(password)) {
    errors.push('Must contain special character (@, #, $, %, ^, &, *, !)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Username sanitization
 * Keycloak usernames can contain: a-z A-Z 0-9 . - _ @
 */
export const sanitizeUsername = (username: string): string => {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9._@-]/g, '')
    .substring(0, 255);
};

/**
 * Validate username
 */
export const validateUsername = (username: string): PasswordValidation => {
  const errors: string[] = [];
  const sanitized = sanitizeUsername(username);

  if (sanitized.length === 0) {
    errors.push('Username must contain valid characters');
  }
  if (sanitized.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  if (sanitized.length > 255) {
    errors.push('Username must not exceed 255 characters');
  }
  if (sanitized !== username) {
    errors.push('Username contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate name fields
 */
export const validateName = (name: string, fieldName: string = 'Name'): PasswordValidation => {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }
  if (name.length > 100) {
    errors.push(`${fieldName} must not exceed 100 characters`);
  }
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    errors.push(`${fieldName} contains invalid characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate signup data
 */
export interface SignupValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateSignupData = (data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}): SignupValidation => {
  const errors: Record<string, string> = {};

  // Email
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // First name
  if (!data.firstName) {
    errors.firstName = 'First name is required';
  } else {
    const nameValidation = validateName(data.firstName, 'First name');
    if (!nameValidation.isValid) {
      errors.firstName = nameValidation.errors[0];
    }
  }

  // Last name
  if (!data.lastName) {
    errors.lastName = 'Last name is required';
  } else {
    const nameValidation = validateName(data.lastName, 'Last name');
    if (!nameValidation.isValid) {
      errors.lastName = nameValidation.errors[0];
    }
  }

  // Password
  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  // Confirm password
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateEmail,
  validatePassword,
  sanitizeUsername,
  validateUsername,
  validateName,
  validateSignupData,
};
