import { format, parseISO, differenceInCalendarDays, isValid } from 'date-fns';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrNumberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return inrFormatter.format(Math.round(amount));
}

export function formatINRCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  return formatINR(amount);
}

export function formatNumberIN(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return inrNumberFormatter.format(value);
}

export function formatDateIN(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    const parsed = parseISO(isoDate);
    if (!isValid(parsed)) return isoDate;
    return format(parsed, 'dd MMM yyyy');
  } catch {
    return isoDate;
  }
}

export function formatDateTimeIN(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    const parsed = parseISO(isoDate);
    if (!isValid(parsed)) return isoDate;
    return format(parsed, 'dd MMM yyyy, hh:mm a');
  } catch {
    return isoDate;
  }
}

export function daysUntil(isoDate?: string, referenceDate = '2026-11-16'): number | null {
  if (!isoDate) return null;
  try {
    const target = parseISO(isoDate);
    const ref = parseISO(referenceDate);
    if (!isValid(target) || !isValid(ref)) return null;
    return differenceInCalendarDays(target, ref);
  } catch {
    return null;
  }
}

export function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | undefined | null>>): void {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
