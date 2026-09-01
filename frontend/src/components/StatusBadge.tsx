import { titleCase } from '../utils/format';

const VARIANTS: Record<string, string> = {
  ACTIVE: 'badge-success',
  CONFIRMED: 'badge-success',
  IN: 'badge-success',
  LEAD: 'badge-warning',
  DRAFT: 'badge-warning',
  INACTIVE: 'badge-neutral',
  OUT: 'badge-danger',
  CANCELLED: 'badge-danger',
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`badge ${VARIANTS[value] ?? 'badge-neutral'}`}>{titleCase(value)}</span>;
}
