import React, { useMemo, useState } from 'react';
import { formatRShare, formatPercentageSafe } from '../../lib/formatUtils.js';
import {
  buildDailyShareFilename, normalizeDailyStatsForShare, renderDailyStoryPng
} from '../../lib/sharePngUtils.js';
import { SharePreviewModal } from './SharePreviewModal.jsx';

export function DailyReviewShareModal({ trades, date, plan, onClose }) {
  const [privacy, setPrivacy] = useState({ hideMoney: false });
  const stats = useMemo(() => normalizeDailyStatsForShare(trades, date, plan, privacy), [trades, date, plan, privacy]);
  const renderBlob = useMemo(() => () => renderDailyStoryPng(stats), [stats]);
  const filename = buildDailyShareFilename(date);
  return <SharePreviewModal title="Compartir resumen del día" filename={filename} renderBlob={renderBlob} onClose={onClose}>
    <b>Resumen diario</b>
    <span>{stats.totalTrades} trade{stats.totalTrades === 1 ? '' : 's'} · {formatRShare(stats.netR)} · {formatPercentageSafe(stats.winRate)} WR</span>
    <label><input type="checkbox" checked={privacy.hideMoney} onChange={() => setPrivacy(prev => ({ ...prev, hideMoney: !prev.hideMoney }))} />Ocultar P/L monetario</label>
  </SharePreviewModal>;
}
