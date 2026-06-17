import * as XLSX from 'xlsx';

export type SheetData = {
  name: string;
  rows: string[][];
};

export type SpreadsheetData = {
  sheets: SheetData[];
};

export function columnLabel(index: number): string {
  let n = index;
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export async function parseSpreadsheet(blob: Blob, filename: string): Promise<SpreadsheetData> {
  const buf = await blob.arrayBuffer();
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const isCsv = ext === 'csv' || blob.type === 'text/csv' || blob.type === 'application/csv';

  const wb = XLSX.read(buf, {
    type: 'array',
    ...(isCsv ? { raw: false } : {}),
  });

  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    if (!ws) return { name, rows: [] as string[][] };
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false }) as string[][];
    return { name, rows };
  });

  return { sheets: sheets.length > 0 ? sheets : [{ name: 'Sheet1', rows: [] }] };
}
