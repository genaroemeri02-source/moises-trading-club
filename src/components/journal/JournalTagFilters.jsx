import React, { useMemo } from 'react';
import { buildJournalTagFilterOptions, getTagMeta } from '../../lib/tradeTags.js';

/**
 * Horizontal tag filter chips for Journal.
 * Shows tags present in trades (+ a few recommended when sparse).
 */
export function JournalTagFilters({
  trades = [],
  selectedTag = '',
  onSelectTag
}) {
  const options = useMemo(() => buildJournalTagFilterOptions(trades), [trades]);
  const hasAnyTagged = (trades || []).some((t) => Array.isArray(t?.tags) && t.tags.length > 0);

  if (!options.length && !hasAnyTagged) return null;

  return (
    <div className="journalTagFilters" aria-label="Filtrar por tags">
      <span className="journalTagFiltersLabel">Tags</span>
      <div className="journalTagFiltersScroll">
        <button
          type="button"
          className={`journalTagChip${selectedTag ? '' : ' journalTagChip--active'}`}
          aria-pressed={!selectedTag}
          onClick={() => onSelectTag?.('')}
        >
          Todos
        </button>
        {options.map((opt) => {
          const meta = getTagMeta(opt.id);
          const active = selectedTag === opt.id;
          return (
            <button
              type="button"
              key={opt.id}
              className={`journalTagChip journalTagChip--${meta?.group || opt.group || 'custom'}${active ? ' journalTagChip--active' : ''}${opt.recommended && !opt.count ? ' journalTagChip--recommended' : ''}`}
              aria-pressed={active}
              title={opt.count ? `${opt.count} trades` : (opt.recommended ? 'Recomendado' : opt.label)}
              onClick={() => onSelectTag?.(active ? '' : opt.id)}
            >
              {opt.label}
              {opt.count > 0 ? <small>{opt.count}</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
