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
  it("accepts a strong password", () => {
    const result = evaluatePasswordStrength("StrongPassw0rd!");
    expect(result.valid).toBe(true);
  });

  it("rejects a short password", () => {
    const result = evaluatePasswordStrength("short1A!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 12 characters long.");
  });

  it("rejects a password missing a symbol", () => {
    const result = evaluatePasswordStrength("StrongPassw0rd");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one symbol.");
  });
});

describe("Password confirmation validation", () => {
  it("accepts matching password and confirmation", () => {
    const result = validatePasswordConfirmation("StrongPassw0rd!", "StrongPassw0rd!");
    expect(result.valid).toBe(true);
  });

  it("rejects when confirmation is missing", () => {
    const result = validatePasswordConfirmation("StrongPassw0rd!", "");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password confirmation is required.");
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

  it("requires a legal disclaimer even for ZIP package options", () => {
    const result = validatePackageOptions({
      archiveName: "DEvidence_batch_0001",
      archiveFormat: "zip",
      password: "",
      legalDisclaimer: "",
      includePdf: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Legal disclaimer is required.");
  });

  it("rejects RAR package options with weak password or missing confirmation", () => {
    const result = validatePackageOptions({
      archiveName: "DEvidence_batch_0001",
      archiveFormat: "rar",
      password: "weakpass",
      confirmPassword: "weakpass",
      legalDisclaimer: "This archive contains evidence files and must be handled securely.",
      includePdf: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 12 characters long.");
  });
});
