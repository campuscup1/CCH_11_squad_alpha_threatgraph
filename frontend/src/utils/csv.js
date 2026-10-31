export const EXPECTED_EVENT_FIELDS = [
  'user_id',
  'ip_address',
  'failed_attempts',
  'unusual_time',
  'unfamiliar_ip',
  'success_after_failures',
];

export const EXPECTED_LOGIN_FIELDS = [
  'user_id',
  'ip_address',
  'timestamp',
  'success',
];

export const EXPECTED_FIELDS = [
  ...EXPECTED_EVENT_FIELDS,
  ...EXPECTED_LOGIN_FIELDS.filter(
    (field) => !EXPECTED_EVENT_FIELDS.includes(field),
  ),
];

export function parseCsv(text) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < cleanText.length; index += 1) {
    const character = cleanText[index];

    if (inQuotes) {
      if (character === '"') {
        if (cleanText[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], missingFields: [] };
  }

  const headers = rows[0].map(
    (header, index) => header.trim() || `column_${index + 1}`,
  );

  const records = rows
    .slice(1)
    .filter((currentRow) => currentRow.some((value) => value.trim() !== ''))
    .map((currentRow) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = currentRow[index] ?? '';
      });
      return record;
    });

  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const missingFields = EXPECTED_FIELDS.filter(
    (field) => !normalizedHeaders.includes(field),
  );

  return { headers, rows: records, missingFields };
}

export function downloadCsvTemplate() {
  const headers = [
    'user_id',
    'ip_address',
    'failed_attempts',
    'unusual_time',
    'unfamiliar_ip',
    'success_after_failures',
    'timestamp',
    'success',
  ];

  const sample = [
    'user_demo',
    '203.0.113.24',
    '6',
    'true',
    'true',
    'false',
    '2026-01-15T02:14:00',
    'false',
  ];

  const csv = `${headers.join(',')}\n${sample.join(',')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'threatgraph-event-template.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
