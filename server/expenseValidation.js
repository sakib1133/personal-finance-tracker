const MAX_FINANCIAL_AMOUNT = 99999999.99;
const AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

function parsePositiveAmount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const normalizedValue = String(value);
  if (!AMOUNT_PATTERN.test(normalizedValue)) {
    return null;
  }

  const amount = Number(normalizedValue);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_FINANCIAL_AMOUNT) {
    return null;
  }

  return amount;
}

module.exports = { MAX_FINANCIAL_AMOUNT, parsePositiveAmount };
