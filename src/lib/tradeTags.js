/**
 * Sprint 13 — Trade classification tags (Decision Intelligence).
 * Tags complement setup / mistakeType / session / quality — they do not replace them.
 * Stored as clean string ids on trade.tags[].
 */

export const TAG_GROUPS = [
  {
    id: 'setup',
    label: 'Setup',
    tags: [
      { id: 'fvg', label: 'FVG', group: 'setup', description: 'Fair Value Gap / desequilibrio' },
      { id: 'ob', label: 'OB', group: 'setup', description: 'Order Block' },
      { id: 'sweep', label: 'Sweep', group: 'setup', description: 'Liquidity sweep' },
      { id: 'breakout', label: 'Breakout', group: 'setup' },
      { id: 'reversal', label: 'Reversal', group: 'setup' },
      { id: 'continuation', label: 'Continuation', group: 'setup' },
      { id: 'liquidity-grab', label: 'Liquidity Grab', group: 'setup' },
      { id: 'news', label: 'News', group: 'setup' },
      { id: 'manual', label: 'Manual', group: 'setup' }
    ]
  },
  {
    id: 'behavior',
    label: 'Conducta',
    tags: [
      { id: 'fomo', label: 'FOMO', group: 'behavior' },
      { id: 'revenge', label: 'Revenge', group: 'behavior' },
      { id: 'overtrade', label: 'Overtrade', group: 'behavior' },
      { id: 'early-entry', label: 'Early Entry', group: 'behavior' },
      { id: 'late-entry', label: 'Late Entry', group: 'behavior' },
      { id: 'moved-sl', label: 'Moved SL', group: 'behavior' },
      { id: 'closed-early', label: 'Closed Early', group: 'behavior' },
      { id: 'no-plan', label: 'No Plan', group: 'behavior' },
      { id: 'hesitation', label: 'Hesitation', group: 'behavior' }
    ]
  },
  {
    id: 'context',
    label: 'Contexto',
    tags: [
      { id: 'ny', label: 'NY', group: 'context' },
      { id: 'london', label: 'London', group: 'context' },
      { id: 'asia', label: 'Asia', group: 'context' },
      { id: 'post-news', label: 'Post News', group: 'context' },
      { id: 'high-impact', label: 'High Impact', group: 'context' },
      { id: 'range-day', label: 'Range Day', group: 'context' },
      { id: 'trend-day', label: 'Trend Day', group: 'context' }
    ]
  },
  {
    id: 'quality',
    label: 'Calidad',
    tags: [
      { id: 'a-plus', label: 'A+', group: 'quality' },
      { id: 'a', label: 'A', group: 'quality' },
      { id: 'b', label: 'B', group: 'quality' },
      { id: 'c', label: 'C', group: 'quality' },
      { id: 'validated', label: 'Validated', group: 'quality' },
      { id: 'experimental', label: 'Experimental', group: 'quality' }
    ]
  }
];

const TAG_META_BY_ID = (() => {
  const map = new Map();
  TAG_GROUPS.forEach((group) => {
    group.tags.forEach((tag) => {
      map.set(tag.id, tag);
    });
  });
  return map;
})();

/** Recommended filter chips when few trades have tags yet. */
export const RECOMMENDED_FILTER_TAG_IDS = ['fvg', 'fomo', 'ny', 'a-plus', 'revenge', 'sweep'];

function slugifyTag(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Normalize any tags input → unique clean id array. Legacy-safe. */
export function normalizeTradeTags(input) {
  if (input == null || input === '') return [];
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw) return [];
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
        else list = raw.split(/[|,;\n\r]+/);
      } catch {
        list = raw.split(/[|,;\n\r]+/);
      }
    } else {
      list = raw.split(/[|,;\n\r]+/);
    }
  } else {
    return [];
  }

  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    let id = '';
    if (item && typeof item === 'object') {
      id = slugifyTag(item.id || item.label || item.name || '');
    } else {
      id = slugifyTag(item);
    }
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  });
  return out;
}

export function mergeTradeTags(existing, next) {
  return normalizeTradeTags([...(normalizeTradeTags(existing) || []), ...(normalizeTradeTags(next) || [])]);
}

export function getTagMeta(tagId) {
  const id = slugifyTag(tagId);
  if (!id) return null;
  return TAG_META_BY_ID.get(id) || { id, label: id, group: 'custom', description: '' };
}

export function getTagsByGroup(tags) {
  const ids = normalizeTradeTags(tags);
  const grouped = {
    setup: [],
    behavior: [],
    context: [],
    quality: [],
    custom: []
  };
  ids.forEach((id) => {
    const meta = getTagMeta(id);
    const group = meta?.group && grouped[meta.group] ? meta.group : 'custom';
    grouped[group].push(meta || { id, label: id, group: 'custom' });
  });
  return grouped;
}

/** Optional denormalized groups for Analytics prep — ids only. */
export function buildTagGroupsPayload(tags) {
  const grouped = getTagsByGroup(tags);
  return {
    setup: grouped.setup.map((t) => t.id),
    behavior: grouped.behavior.map((t) => t.id),
    context: grouped.context.map((t) => t.id),
    quality: grouped.quality.map((t) => t.id)
  };
}

/** Analytics / Journal helper — tags for a single trade. */
export function getTradeTags(trade = {}) {
  return normalizeTradeTags(trade?.tags);
}

export function tradeHasTag(trade, tagId) {
  const id = slugifyTag(tagId);
  if (!id) return false;
  return getTradeTags(trade).includes(id);
}

/**
 * Build filter chip options from real trades + a few recommended ids.
 * Never dumps the full catalog of empty tags.
 */
export function buildJournalTagFilterOptions(trades = [], { max = 12 } = {}) {
  const counts = new Map();
  (trades || []).forEach((trade) => {
    getTradeTags(trade).forEach((id) => {
      counts.set(id, (counts.get(id) || 0) + 1);
    });
  });

  const present = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => {
      const meta = getTagMeta(id);
      return { id, label: meta?.label || id, group: meta?.group || 'custom', count };
    });

  if (present.length >= 3) {
    return present.slice(0, max);
  }

  const recommended = RECOMMENDED_FILTER_TAG_IDS
    .filter((id) => !counts.has(id))
    .map((id) => {
      const meta = getTagMeta(id);
      return { id, label: meta?.label || id, group: meta?.group || 'custom', count: 0, recommended: true };
    });

  return [...present, ...recommended].slice(0, max);
}

export function filterTradesByTag(trades = [], tagId) {
  const id = slugifyTag(tagId);
  if (!id || id === 'all' || id === 'todos') return trades || [];
  return (trades || []).filter((t) => tradeHasTag(t, id));
}

export function toggleTradeTag(currentTags, tagId) {
  const id = slugifyTag(tagId);
  if (!id) return normalizeTradeTags(currentTags);
  const set = new Set(normalizeTradeTags(currentTags));
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}
