import { describe, expect, it } from "vitest";
import {
  evaluatePasswordStrength,
  normalizeArchiveName,
  validateArchiveName,
  validatePackageOptions,
  validatePasswordConfirmation,
} from "./packageValidation";

describe("Archive name validation", () => {
  it("accepts a valid archive name", () => {
    const result = validateArchiveName("DEvidence_batch_2026-08-10");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects names with spaces and invalid characters", () => {
    const result = validateArchiveName("Invalid Name ☠");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Archive name may only contain letters, numbers, dots, underscores, and hyphens. No spaces or accented characters allowed."
    );
  });

  it("rejects names that start or end with punctuation", () => {
    const result = validateArchiveName("-bad-name-");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Archive name must not start or end with a dot, underscore, or hyphen.");
  });
});

describe("Archive name normalization", () => {
  it("replaces whitespace with underscores", () => {
    expect(normalizeArchiveName("Digital Evidence 001")).toBe("Digital_Evidence_001");
  });
});

describe("Password strength validation", () => {
  it("accepts any password (strength validation removed)", () => {
    const result1 = evaluatePasswordStrength("StrongPassw0rd!");
    const result2 = evaluatePasswordStrength("short");
    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });
});

describe("Password confirmation validation", () => {
  it("accepts matching password and confirmation", () => {
    const result = validatePasswordConfirmation("StrongPassw0rd!", "StrongPassw0rd!");
    expect(result.valid).toBe(true);
  });

  it("accepts empty password and confirmation (optional mode)", () => {
    const result = validatePasswordConfirmation("", "");
    expect(result.valid).toBe(true);
  });

  it("rejects when password and confirmation differ", () => {
    const result = validatePasswordConfirmation("StrongPassw0rd!", "WrongPassw0rd!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password and confirmation do not match.");
  });
});

describe("Package options validation", () => {
  it("accepts valid ZIP package options without password", () => {
    const result = validatePackageOptions({
      archiveName: "DEvidence_batch_0001",
      archiveFormat: "zip",
      password: "",
      legalDisclaimer: "This archive contains evidence files and must be handled securely.",
      includePdf: true,
    });
    expect(result.valid).toBe(true);
  });

  it("accepts empty legal disclaimer (optional mode)", () => {
    const result = validatePackageOptions({
      archiveName: "DEvidence_batch_0001",
      archiveFormat: "zip",
      password: "",
      legalDisclaimer: "",
      includePdf: true,
    });
    expect(result.valid).toBe(true);
  });

  it("accepts RAR package options with any matching password (optional mode)", () => {
    const result = validatePackageOptions({
      archiveName: "DEvidence_batch_0001",
      archiveFormat: "rar",
      password: "weakpass",
      confirmPassword: "weakpass",
      legalDisclaimer: "",
      includePdf: true,
    });
    expect(result.valid).toBe(true);
  });
});
