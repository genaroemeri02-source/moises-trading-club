import React from 'react';
import {
  TAG_GROUPS,
  normalizeTradeTags,
  toggleTradeTag,
  getTagMeta
} from '../../lib/tradeTags.js';

/**
 * Multi-select classification chips for Trade Form.
 * Optional — never blocks save.
 */
export function TradeTagsPicker({
  value,
  onChange,
  groups = TAG_GROUPS,
  title = 'Clasificación',
  hint = 'Opcional. Los tags ayudan a detectar patrones, errores y contextos.'
}) {
  const selected = normalizeTradeTags(value);

  function toggle(tagId) {
    onChange?.(toggleTradeTag(selected, tagId));
  }

  return (
    <section className="tradeTags" aria-label={title}>
      <header className="tradeTagsHead">
        <div>
          <b>{title}</b>
          <p>Clasificá el trade para mejorar tus lecturas futuras.</p>
        </div>
        {selected.length > 0 && (
          <span className="auroraStatusPill auroraStatusPill--neutral">{selected.length} tags</span>
        )}
      </header>
      <p className="tradeTagsHint">{hint}</p>
      <div className="tradeTagsGroups">
        {groups.map((group) => (
          <div key={group.id} className={`tradeTagGroup tradeTagGroup--${group.id}`}>
            <span className="tradeTagGroupLabel">{group.label}</span>
            <div className="tradeTagChipRow" role="group" aria-label={group.label}>
              {group.tags.map((tag) => {
                const active = selected.includes(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    className={`tradeTagChip tradeTagChip--${group.id}${active ? ' tradeTagChip--active' : ''}`}
                    aria-pressed={active}
                    title={tag.description || tag.label}
                    onClick={() => toggle(tag.id)}
                  >
                    {active ? '✓ ' : ''}{tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="tradeTagsSelected" aria-live="polite">
          {selected.map((id) => {
            const meta = getTagMeta(id);
            return (
              <button
                type="button"
                key={id}
                className={`tradeTagChip tradeTagChip--active tradeTagChip--${meta?.group || 'custom'}`}
                onClick={() => toggle(id)}
                title="Quitar tag"
              >
                {meta?.label || id} ×
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Read-only chips for Trade Detail / Journal row. */
export function TradeTagsDisplay({ tags, title = 'Clasificación', empty = false }) {
  const list = normalizeTradeTags(tags);
  if (!list.length && !empty) return null;
  if (!list.length) {
    return (
      <div className="tradeDetailTags">
        <span className="tradeDetailTagsLabel">{title}</span>
        <em className="tradeDetailTagsEmpty">Sin tags</em>
      </div>
    );
  }
  return (
    <div className="tradeDetailTags" aria-label={title}>
      <span className="tradeDetailTagsLabel">{title}</span>
      <div className="tradeDetailTagsRow">
        {list.map((id) => {
          const meta = getTagMeta(id);
          return (
            <span
              key={id}
              className={`tradeTagChip tradeTagChip--active tradeTagChip--${meta?.group || 'custom'} tradeTagChip--readonly`}
            >
              {meta?.label || id}
            </span>
          );
        })}
      </div>
    </div>
  );
}
