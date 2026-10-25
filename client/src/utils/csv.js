export const escapeCsvCell = (value) => {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

export const serializeCsv = (rows) => rows
  .map((row) => row.map(escapeCsvCell).join(','))
  .join('\n');
