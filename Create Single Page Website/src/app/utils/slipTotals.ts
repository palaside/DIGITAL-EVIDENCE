export function parseSlipAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return 0;
  }

  const amount = Number(match[0]);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculateSlipTotal(rows: Array<{ amount: unknown }>): number {
  return rows.reduce((sum, row) => sum + parseSlipAmount(row.amount), 0);
}

export function formatSlipTotal(total: number, currency = "THB"): string {
  return `${total.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
