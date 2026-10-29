import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCents,
  addCents,
  fromCents,
  MAX_FINANCIAL_AMOUNT,
  parsePositiveAmount,
  toCents
} from '../src/utils/money.js';
import { normalizeResponseData } from '../src/utils/normalizeResponseData.js';

test('strict amount parsing matches the server amount range and precision', () => {
  assert.equal(parsePositiveAmount('0.01'), 0.01);
  assert.equal(parsePositiveAmount('99999999.99'), MAX_FINANCIAL_AMOUNT);
  for (const invalid of ['0', '-1', '1.234', '15junk', '1e3', '.5', '01', '100000000', '']) {
    assert.equal(parsePositiveAmount(invalid), null, `${invalid} should be rejected`);
  }
});

test('currency helpers use exact cents and refuse malformed or unsafe amounts', () => {
  assert.equal(toCents('0.10') + toCents('0.20') + toCents('0.30'), 60);
  assert.equal(formatCents(-1), '-0.01');
  assert.equal(fromCents(1234), 12.34);
  assert.throws(() => toCents('1.234'), /two decimal places/);
  assert.throws(() => toCents('not money'), /two decimal places/);
  assert.throws(() => addCents(Number.MAX_SAFE_INTEGER, 1), /safe integer range/);
});

test('response normalization converts monetary values only, preserving numeric-looking text', () => {
  const result = normalizeResponseData({
    amount: '123.45',
    monthlyBudget: '100.00',
    note: '1,000',
    name: '2026',
    nested: [{ note: '-3.50', amount: '0.10' }]
  });

  assert.deepEqual(result, {
    amount: 123.45,
    monthlyBudget: 100,
    note: '1,000',
    name: '2026',
    nested: [{ note: '-3.50', amount: 0.1 }]
  });
});
