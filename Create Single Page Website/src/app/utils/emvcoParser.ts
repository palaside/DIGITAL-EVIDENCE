/**
 * Utility for parsing EMVCo standard payloads (used in Thai PromptPay / Bank Slips).
 */

export interface EMVCoData {
  payload: string;
  amount?: string;
  // We can add other fields here later (e.g., sender bank, receiver account)
}

/**
 * Parses an EMVCo QR code payload string to extract relevant data like the transaction amount.
 * The format is: ID (2 chars) + Length (2 chars) + Value
 */
export function parseEMVCoPayload(payload: string): EMVCoData {
  const data: EMVCoData = { payload };
  if (!payload || payload.length < 10) return data;

  try {
    let i = 0;
    while (i < payload.length) {
      // Each tag starts with a 2-digit ID
      const id = payload.substring(i, i + 2);
      i += 2;
      
      // Followed by a 2-digit length
      const lengthStr = payload.substring(i, i + 2);
      i += 2;
      
      const length = parseInt(lengthStr, 10);
      if (isNaN(length)) break; // Parsing error, abort
      
      // Followed by the value of that length
      const value = payload.substring(i, i + length);
      i += length;

      // Extract specific known tags
      if (id === "54") {
        // Tag 54 = Transaction Amount
        data.amount = value;
      }
    }
  } catch (err) {
    console.error("Failed to parse EMVCo payload", err);
  }

  return data;
}
