import { PageMeta } from '../types';

interface PaginationProps {
  meta: PageMeta;
  onChange: (page: number) => void;
}

export function Pagination({ meta, onChange }: PaginationProps) {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="pagination">
      <span className="muted">
        Showing {from} to {to} of {meta.total}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={meta.page <= 1}
          onClick={() => onChange(meta.page - 1)}
        >
          Previous
        </button>
        <span className="muted">
          Page {meta.page} of {meta.totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onChange(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
