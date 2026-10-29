export const MAX_FINANCIAL_AMOUNT = 99999999.99;

const AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const CENTS_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function parsePositiveAmount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalizedValue = String(value);
  if (!AMOUNT_PATTERN.test(normalizedValue)) {
    return null;
  }

  const amount = Number(normalizedValue);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_FINANCIAL_AMOUNT
    ? amount
    : null;
}

export function toCents(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError('Monetary values must be numeric');
  }

  const match = String(value).match(CENTS_PATTERN);
  if (!match) {
    throw new TypeError('Monetary values must have no more than two decimal places');
  }

  const [, sign, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('Monetary value exceeds the safe integer range');
  }

  return sign ? -cents : cents;
}

export function formatCents(cents) {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('Monetary total exceeds the safe integer range');
  }

  const sign = cents < 0 ? '-' : '';
  const absoluteCents = Math.abs(cents);
  const whole = Math.floor(absoluteCents / 100);
  const fraction = String(absoluteCents % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function fromCents(cents) {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('Monetary total exceeds the safe integer range');
  }

  return cents / 100;
}

export function addCents(total, value) {
  const sum = total + value;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(value) || !Number.isSafeInteger(sum)) {
    throw new RangeError('Monetary total exceeds the safe integer range');
  }
  return sum;
}
