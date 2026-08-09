export type ArchiveFormat = "zip" | "rar";

export interface PackageOptions {
  archiveName: string;
  archiveFormat: ArchiveFormat;
  password: string;
  confirmPassword?: string;
  legalDisclaimer?: string;
  includePdf?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ARCHIVE_NAME_PATTERN = /^[A-Za-z0-9._-]{3,80}$/;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_RULES = [
  { test: /[a-z]/, message: "at least one lowercase letter" },
  { test: /[A-Z]/, message: "at least one uppercase letter" },
  { test: /\d/, message: "at least one digit" },
  { test: /[^\w\s]/, message: "at least one symbol" },
];

export function normalizeArchiveName(input: string): string {
  return input.trim().replace(/\s+/g, "_");
}

export function validateArchiveName(name: string): ValidationResult {
  const trimmed = name.trim();
  const errors: string[] = [];

  if (trimmed.length === 0) {
    errors.push("Archive name is required.");
  } else {
    if (trimmed.length < 3 || trimmed.length > 80) {
      errors.push("Archive name must be between 3 and 80 characters.");
    }
    if (!ARCHIVE_NAME_PATTERN.test(trimmed)) {
      errors.push(
        "Archive name may only contain letters, numbers, dots, underscores, and hyphens. No spaces or accented characters allowed."
      );
    }
    if (/\.{2,}/.test(trimmed)) {
      errors.push("Archive name must not contain consecutive dots.");
    }
    if (/^[-_.]/.test(trimmed) || /[-_.]$/.test(trimmed)) {
      errors.push("Archive name must not start or end with a dot, underscore, or hyphen.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function evaluatePasswordStrength(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }

  PASSWORD_RULES.forEach(({ test, message }) => {
    if (!test.test(password)) {
      errors.push(`Password must contain ${message}.`);
    }
  });

  if (/\s/.test(password)) {
    errors.push("Password must not contain whitespace characters.");
  }

  return { valid: errors.length === 0, errors };
}

export function validatePasswordConfirmation(password: string, confirmPassword?: string): ValidationResult {
  const errors: string[] = [];

  if (password.length === 0) {
    errors.push("Password is required for RAR archive creation.");
  }

  if (!confirmPassword || confirmPassword.trim().length === 0) {
    errors.push("Password confirmation is required.");
  }

  if (password !== confirmPassword) {
    errors.push("Password and confirmation do not match.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateLegalDisclaimer(legalDisclaimer?: string): ValidationResult {
  const errors: string[] = [];
  const value = legalDisclaimer?.trim() ?? "";

  if (value.length === 0) {
    errors.push("Legal disclaimer is required.");
  } else if (value.length < 20) {
    errors.push("Legal disclaimer must be at least 20 characters long.");
  }

  return { valid: errors.length === 0, errors };
}

export function validatePackageOptions(options: PackageOptions): ValidationResult {
  const errors: string[] = [];
  const archiveResult = validateArchiveName(options.archiveName);
  if (!archiveResult.valid) {
    errors.push(...archiveResult.errors);
  }

  const disclaimerResult = validateLegalDisclaimer(options.legalDisclaimer);
  if (!disclaimerResult.valid) {
    errors.push(...disclaimerResult.errors);
  }

  if (options.archiveFormat === "rar") {
    const passwordResult = evaluatePasswordStrength(options.password);
    if (!passwordResult.valid) {
      errors.push(...passwordResult.errors);
    }

    const confirmResult = validatePasswordConfirmation(options.password, options.confirmPassword);
    if (!confirmResult.valid) {
      errors.push(...confirmResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}
