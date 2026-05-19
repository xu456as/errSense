function escapeCsvValue(value: string | number) {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
