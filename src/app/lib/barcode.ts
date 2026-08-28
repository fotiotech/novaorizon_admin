// lib/barcode.ts

/**
 * Computes the EAN/UPC check digit.
 * Works for EAN‑8, EAN‑13, UPC‑A, and ISBN‑13.
 */
function computeEANCheckDigit(code: string): string {
  const digits = code.split("").map(Number);
  let sum = 0;
  for (let i = digits.length - 1, j = 0; i >= 0; i--, j++) {
    const multiplier = j % 2 === 0 ? 3 : 1;
    sum += digits[i] * multiplier;
  }
  const check = (10 - (sum % 10)) % 10;
  return check.toString();
}

/**
 * Validates a barcode against a given type.
 * Supported types: 'EAN-13', 'UPC-A', 'EAN-8', 'ISBN-13'.
 * If type is not provided, auto‑detects based on length.
 */
export function isValidBarcode(code: string, type?: string): boolean {
  const cleaned = code.replace(/\D/g, "");
  if (!cleaned) return false;

  // If type is given, enforce the corresponding length
  let validLength = false;
  let expectedCheck = "";
  switch (type) {
    case "EAN-13":
    case "ISBN-13":
      validLength = cleaned.length === 13;
      break;
    case "UPC-A":
      validLength = cleaned.length === 12;
      break;
    case "EAN-8":
      validLength = cleaned.length === 8;
      break;
    default:
      // Auto‑detect by length
      if (cleaned.length === 13) type = "EAN-13";
      else if (cleaned.length === 12) type = "UPC-A";
      else if (cleaned.length === 8) type = "EAN-8";
      else return false;
      validLength = true;
  }

  if (!validLength) return false;

  // Optional: special ISBN-13 prefix check
  if (
    type === "ISBN-13" &&
    !cleaned.startsWith("978") &&
    !cleaned.startsWith("979")
  ) {
    return false;
  }

  // Validate check digit
  const body = cleaned.slice(0, -1);
  const givenCheck = cleaned.slice(-1);
  const computedCheck = computeEANCheckDigit(body);
  return givenCheck === computedCheck;
}
