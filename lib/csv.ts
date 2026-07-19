export interface SensorRow {
  [key: string]: string | number;
}

export interface ParsedCsv {
  headers: string[];
  rows: SensorRow[];
  numericColumns: string[];
  rowCount: number;
}

export function parseCsv(text: string): ParsedCsv {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new Error('CSV file is empty.');
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const headers = splitCsvLine(lines[0]);
  const rows: SensorRow[] = [];
  const numericColumnSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: SensorRow = {};
    headers.forEach((h, idx) => {
      const raw = values[idx] ?? '';
      const num = Number(raw);
      if (raw !== '' && !Number.isNaN(num) && Number.isFinite(num)) {
        row[h] = num;
        if (i === 1) numericColumnSet.add(h);
        else if (!numericColumnSet.has(h)) {
          // became non-numeric
        }
      } else {
        row[h] = raw;
        numericColumnSet.delete(h);
      }
    });
    rows.push(row);
  }

  // Re-validate: a column is numeric only if ALL rows have finite numbers
  const numericColumns = headers.filter((h) =>
    rows.every((r) => {
      const v = r[h];
      return typeof v === 'number' && Number.isFinite(v);
    })
  );

  if (numericColumns.length === 0) {
    throw new Error(
      'No numeric sensor columns were found. Ensure your CSV contains numeric readings.'
    );
  }

  return { headers, rows, numericColumns, rowCount: rows.length };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
