export function toCSV(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escape(c.value(row))).join(',')
  );

  return [header, ...lines].join('\n');
}