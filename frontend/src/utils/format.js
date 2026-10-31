function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return value ? String(value) : '—';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return value ? String(value) : '—';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return value ? String(value) : '—';

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatClock(value) {
  return formatTime(value);
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return new Intl.NumberFormat().format(number);
}

export function riskTone(level) {
  const value = String(level || '').toLowerCase();

  if (value === 'critical') return 'critical';
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  if (value === 'low') return 'low';
  return 'neutral';
}

export function riskToneFromScore(score) {
  const value = Number(score);
  if (Number.isNaN(value)) return 'neutral';
  if (value >= 80) return 'critical';
  if (value >= 60) return 'high';
  if (value >= 30) return 'medium';
  return 'low';
}

export function statusTone(status) {
  const value = String(status || '').toLowerCase();

  if (value === 'pending') return 'pending';
  if (value === 'reviewed') return 'reviewed';
  if (value === 'false positive') return 'false-positive';
  if (value === 'success') return 'low';
  if (value === 'failed') return 'high';
  return 'neutral';
}

export function shortText(value, length = 120) {
  if (!value) return '—';
  const text = String(value);
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

export function pluralize(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}
