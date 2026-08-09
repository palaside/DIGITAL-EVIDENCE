import { describe, expect, it } from "vitest";
import { validateSlipData } from "./slipValidatorEngine";
import { verifyBankName, formatBankName } from "./slipValidation";
import { extractAmount } from "./slipAmountParser";
import { normalizeSlipDate } from "./slipDateParser";
import { cleanPersonName } from "./slipNameParser";
import {
  messySlipOcrPayload,
  expectedValidatedSlipData,
  bankValidationCases,
  amountParsingCases,
  dateParsingCases,
  nameCleaningCases,
} from "./slipFixtures";

describe("Slip Validator Engine", () => {
  it("should validate messy OCR data and upgrade to QR verified output", () => {
    const validated = validateSlipData(messySlipOcrPayload);

    expect(validated.bankName).toBe(expectedValidatedSlipData.bankName);
    expect(validated.bankConfidence).toBe(expectedValidatedSlipData.bankConfidence);
    expect(validated.transactionDate).toBe(expectedValidatedSlipData.transactionDate);
    expect(validated.senderName).toBe(expectedValidatedSlipData.senderName);
    expect(validated.receiverName).toBe(expectedValidatedSlipData.receiverName);
    expect(validated.amount).toBe(expectedValidatedSlipData.amount);
    expect(validated.qrPayload).toBe(expectedValidatedSlipData.qrPayload);
    expect(validated.isQrVerified).toBe(true);
  });
});

describe("Bank Verification", () => {
  bankValidationCases.forEach(({ input, expected, minConfidence }) => {
    it(`should match bank name for "${input}"`, () => {
      const verified = verifyBankName(input);
      const output = formatBankName(verified.matchedBank, input);
      expect(output).toBe(expected);
      expect(verified.confidence).toBeGreaterThanOrEqual(minConfidence);
    });
  });
});

describe("Amount Parsing", () => {
  amountParsingCases.forEach(({ input, expected, minConfidence }) => {
    it(`should normalize amount from "${input}"`, () => {
      const result = extractAmount(input);
      expect(result.amount).toBe(expected);
      expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
    });
  });
});

describe("Date Parsing", () => {
  dateParsingCases.forEach(({ input, expected, minConfidence }) => {
    it(`should normalize date from "${input}"`, () => {
      const result = normalizeSlipDate(input);
      expect(result.normalizedDate).toBe(expected);
      expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
    });
  });
});

describe("Name Cleaning", () => {
  nameCleaningCases.forEach(({ input, expected, minConfidence }) => {
    it(`should clean name from "${input}"`, () => {
      const result = cleanPersonName(input);
      expect(result.cleanName).toBe(expected);
      expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
    });
  });
});
