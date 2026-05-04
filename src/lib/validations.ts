/**
 * Password validation
 */
export const validatePassword = (password: string) => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Must contain uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Must contain lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Must contain number");
  }
  if (!/[@#$%^&*!]/.test(password)) {
    errors.push("Must contain special character (@, #, $, %, ^, &, *, !)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Get password strength (0-4)
 */
export const getPasswordStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[@#$%^&*!]/.test(password)) strength++;

  return Math.min(strength, 4);
};

/**
 * Get strength label
 */
export const getStrengthLabel = (strength: number): string => {
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  return labels[strength] || "Very Weak";
};

/**
 * Get strength color (for UI)
 */
export const getStrengthColor = (strength: number): string => {
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
  return colors[strength] || "bg-red-500";
};
