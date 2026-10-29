const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeResponseData } = require('../normalizeData');

test('server response normalization preserves numeric-looking text and converts money fields', () => {
  assert.deepEqual(normalizeResponseData({
    amount: '123.45',
    monthly_budget: '100.00',
    note: '1,000',
    name: '2026',
    nested: [{ note: '42', amount: '0.10' }]
  }), {
    amount: 123.45,
    monthly_budget: 100,
    note: '1,000',
    name: '2026',
    nested: [{ note: '42', amount: 0.1 }]
  });
});
