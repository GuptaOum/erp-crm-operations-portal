import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';

interface SearchSelectProps<T> {
  id?: string;
  selectedLabel: string;
  placeholder: string;
  disabled?: boolean;
  search: (term: string) => Promise<T[]>;
  optionKey: (item: T) => string;
  optionLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onClear: () => void;
}

export function SearchSelect<T>({
  id,
  selectedLabel,
  placeholder,
  disabled,
  search,
  optionKey,
  optionLabel,
  onSelect,
  onClear,
}: SearchSelectProps<T>) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      search(term.trim())
        .then((items) => {
          if (active) {
            setResults(items);
            setError('');
          }
        })
        .catch((searchError) => {
          if (active) {
            setError(getErrorMessage(searchError));
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, open, search]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (container.current && !container.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  if (selectedLabel && !open) {
    return (
      <div className="search-select" ref={container}>
        <div className="search-select-value">
          <span>{selectedLabel}</span>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={disabled}
            onClick={() => {
              onClear();
              setTerm('');
              setOpen(true);
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-select" ref={container}>
      <input
        id={id}
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
      />
      {open ? (
        <div className="search-select-menu">
          {loading ? <div className="search-select-note">Searching</div> : null}
          {!loading && error ? <div className="search-select-note">{error}</div> : null}
          {!loading && !error && results.length === 0 ? (
            <div className="search-select-note">Nothing matched</div>
          ) : null}
          {!loading && !error
            ? results.map((item) => (
                <button
                  type="button"
                  key={optionKey(item)}
                  className="search-select-option"
                  onClick={() => {
                    onSelect(item);
                    setTerm('');
                    setOpen(false);
                  }}
                >
                  {optionLabel(item)}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
