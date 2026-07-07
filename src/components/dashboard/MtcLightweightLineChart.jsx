import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from 'lucide-react';
import { createChart, AreaSeries, CrosshairMode, LineType } from 'lightweight-charts';
import { monthKey } from '../../lib/dateUtils.js';
import { money } from '../../lib/formatUtils.js';

function toUtcTimestampSeconds(input) {
  if (input == null || input === '') return null;
  if (input instanceof Date) {
    const ms = input.getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  if (typeof input === 'object') {
    if (Number.isFinite(Number(input.seconds))) return Math.floor(Number(input.seconds));
    if (Number.isFinite(Number(input._seconds))) return Math.floor(Number(input._seconds));
    if (typeof input.toDate === 'function') return toUtcTimestampSeconds(input.toDate());
  }
  if (typeof input === 'number' || /^\d+$/.test(String(input).trim())) {
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n > 9999999999 ? n / 1000 : n);
  }
  const raw = String(input).trim();
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const ts = Date.UTC(y, mo - 1, d) / 1000;
    return Number.isFinite(ts) ? Math.floor(ts) : null;
  }
  m = raw.match(/^(\d{2})[-/](\d{2})$/);
  if (m) {
    const year = Number(String(monthKey()).slice(0, 4));
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const ts = Date.UTC(year, mo - 1, d) / 1000;
    return Number.isFinite(ts) ? Math.floor(ts) : null;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function normalizeLightweightChartData(points = [], mode = 'pnl') {
  if (!Array.isArray(points) || !points.length) return [];
  const byTime = new Map();
  points.forEach(point => {
    const value = Number(mode === 'pnl' ? point?.value : point?.equity ?? point?.value);
    if (!Number.isFinite(value)) return;
    const rawTime = point?.time ?? point?.date ?? point?.day ?? point?.label ?? point?.name ?? point?.createdAt ?? point?.updatedAt;
    const time = toUtcTimestampSeconds(rawTime);
    if (!Number.isInteger(time) || time <= 0) return;
    byTime.set(time, { time, value });
  });
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function normalizeLwChartPoints(data = [], mode = 'pnl') {
  return normalizeLightweightChartData(data, mode);
}

function getLwChartOptions(theme = 'dark', compact = false, showCrosshair = true) {
  const isDark = theme !== 'light';
  const crosshairColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,17,23,0.14)';
  return {
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: isDark ? '#8b94a7' : '#4b5563',
      fontFamily: "'Manrope','Inter',system-ui,sans-serif",
      fontSize: compact ? 10 : 11,
      attributionLogo: false
    },
    grid: {
      vertLines: { visible: true, color: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,17,23,0.05)' },
      horzLines: { visible: true, color: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,17,23,0.05)' }
    },
    crosshair: {
      mode: showCrosshair ? CrosshairMode.Magnet : CrosshairMode.Hidden,
      vertLine: { visible: showCrosshair, width: 1, color: crosshairColor, style: 2, labelBackgroundColor: isDark ? 'rgba(18,22,30,0.92)' : 'rgba(255,255,255,0.96)' },
      horzLine: { visible: showCrosshair, width: 1, color: crosshairColor, style: 2, labelBackgroundColor: isDark ? 'rgba(18,22,30,0.92)' : 'rgba(255,255,255,0.96)' }
    },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: compact ? 0.18 : 0.16, bottom: compact ? 0.14 : 0.12 } },
    leftPriceScale: { visible: false },
    timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, rightOffset: 4 },
    handleScroll: false,
    handleScale: false
  };
}

function getLwAreaSeriesOptions(positive, theme = 'dark', compact = false, currency) {
  const line = positive ? '#22c55e' : '#ef4444';
  const top = positive ? (theme !== 'light' ? 'rgba(34,197,94,0.16)' : 'rgba(34,197,94,0.11)') : (theme !== 'light' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)');
  const formatValue = (price) => currency ? currency(price) : money(price);
  return {
    lineColor: line,
    topColor: top,
    bottomColor: 'rgba(0,0,0,0)',
    lineWidth: compact ? 1.8 : 2.15,
    lineType: LineType.Simple,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: compact ? 3.5 : 4,
    crosshairMarkerBorderColor: theme !== 'light' ? 'rgba(7,9,13,0.85)' : 'rgba(255,255,255,0.95)',
    crosshairMarkerBackgroundColor: line,
    priceFormat: { type: 'custom', formatter: formatValue, minMove: 0.01 }
  };
}

export function DashboardChartFallback({ compact = false }) {
  return (
    <div className={`dashboardChartFallback ${compact ? 'compact' : ''}`}>
      <LineChart size={compact ? 22 : 26} />
      <b>Curva en formación</b>
      <span>Requiere al menos 2 días operados</span>
    </div>
  );
}

export function MtcLightweightLineChart({ data = [], mode = 'pnl', height = 240, compact = false, theme = 'auto', currency, showCrosshair = true }) {
  const containerRef = useRef(null);
  const [resolvedTheme, setResolvedTheme] = useState('dark');
  const points = useMemo(() => normalizeLwChartPoints(data, mode), [data, mode]);
  const hasEnoughData = points.length >= 2;
  const positive = useMemo(() => {
    if (!points.length) return true;
    if (mode === 'pnl') return Number(points[points.length - 1]?.value || 0) >= 0;
    return Number(points[points.length - 1]?.value || 0) >= Number(points[0]?.value || 0);
  }, [points, mode]);
  useEffect(() => {
    if (theme !== 'auto') { setResolvedTheme(theme); return undefined; }
    const readTheme = () => setResolvedTheme(document.documentElement?.dataset?.theme === 'light' ? 'light' : 'dark');
    readTheme();
    const mo = new MutationObserver(readTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, [theme]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasEnoughData) return undefined;
    const chart = createChart(el, { ...getLwChartOptions(resolvedTheme, compact, showCrosshair), width: el.clientWidth || 320, height });
    const series = chart.addSeries(AreaSeries, getLwAreaSeriesOptions(positive, resolvedTheme, compact, currency));
    series.setData(points);
    chart.timeScale().fitContent();
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.floor(entry.contentRect.width);
      if (nextWidth > 0) chart.applyOptions({ width: nextWidth, height });
    });
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); };
  }, [points, hasEnoughData, resolvedTheme, compact, showCrosshair, height, positive, currency]);
  if (!hasEnoughData) return <DashboardChartFallback compact={compact} />;
  return (
    <div
      ref={containerRef}
      className={`mtcLwChart ${compact ? 'compact' : ''} ${resolvedTheme === 'light' ? 'light' : 'dark'} ${positive ? 'positive' : 'negative'}`}
      style={{ height }}
      role="img"
      aria-label={mode === 'pnl' ? 'Gráfico de P/L neto acumulado' : 'Gráfico de curva de equity'}
    />
  );
}
