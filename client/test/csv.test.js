import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCsv } from '../src/utils/csv.js';

test('CSV serialization quotes fields and escapes embedded quotes and line breaks', () => {
  assert.equal(
    serializeCsv([['category', 'note'], ['Food', 'said "hello"\nagain']]),
    '"category","note"\n"Food","said ""hello""\nagain"'
  );
});

test('CSV serialization neutralizes spreadsheet formula prefixes', () => {
  assert.equal(
    serializeCsv([['=1+1', '  @SUM(A1:A2)', '-cmd', '+1']]),
    `"'\u003d1+1","'  @SUM(A1:A2)","'-cmd","'+1"`
  );
});
