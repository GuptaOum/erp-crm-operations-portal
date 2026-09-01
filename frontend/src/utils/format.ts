const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : '-';
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
