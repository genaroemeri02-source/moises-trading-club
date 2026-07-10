import {
  formatCurrencySafe, formatRShare, formatPercentageSafe, formatRiskPctLabel
} from './formatUtils.js';
import { today, formatDateLabel, safeDate } from './dateUtils.js';
import { safeArray, normalizeTradeSetup } from './tradeUtils.js';
import { normalizeTradeForExport, sanitizeFilenamePart } from './importExportUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel, calculateDailyTradeStats } from './analyticsUtils.js';
import {
  RISK_SETTINGS_DEFAULTS,
  RISK_SETTINGS_LOCAL_KEY,
  getLocalRiskSettings
} from './riskSettingsStore.js';

const riskDefaults = RISK_SETTINGS_DEFAULTS;

function getRiskSettings() {
  return getLocalRiskSettings();
}

export function toCanvasBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1)); }

export function downloadGeneratedBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildTradeShareFilename(trade) {
  const symbol = sanitizeFilenamePart(trade.asset || trade.symbol || 'trade').toUpperCase();
  const date = sanitizeFilenamePart(String(trade.tradingDay || trade.date || safeDate(trade.createdAt) || today()).slice(0, 10));
  return `mtc-trade-story-${symbol}-${date}.png`;
}

export function buildDailyShareFilename(date) { return `mtc-daily-review-${sanitizeFilenamePart(String(date || today()).slice(0, 10))}.png`; }

function resolveTradeRiskPct(trade = {}, riskSettings = getRiskSettings()) {
  const rawPct = [trade.riskPct, trade.riskPercent, trade.risk_percentage, trade.risk].map(Number).find(n => Number.isFinite(n) && n > 0);
  const settingsPct = Number(riskSettings?.riskPerTradePct || 0);
  let storedRiskPct = null;
  try { storedRiskPct = JSON.parse(localStorage.getItem(RISK_SETTINGS_LOCAL_KEY) || '{}')?.riskPerTradePct; } catch {}
  const hasStoredRiskPct = storedRiskPct !== null && storedRiskPct !== undefined && storedRiskPct !== '';
  if (rawPct && !(rawPct === riskDefaults.riskPerTradePct && (!hasStoredRiskPct || settingsPct !== rawPct))) return rawPct;
  const riskMoney = Number(trade.riskMoney || 0);
  const capital = Number(trade.accountBalance || trade.accountCapital || trade.capital || trade.initialBalance || riskSettings?.accountCapital || 0);
  if (riskMoney > 0 && capital > 0) return Math.abs(riskMoney) / capital * 100;
  if (hasStoredRiskPct && settingsPct > 0) return settingsPct;
  return null;
}

function getTradeRiskLabel(trade = {}, privacy = {}) {
  const riskSettings = getRiskSettings();
  const pctValue = resolveTradeRiskPct(trade, riskSettings);
  const pctLabel = formatRiskPctLabel(pctValue);
  if (!privacy.hideMoney && Number(trade.riskMoney || 0) > 0) return formatCurrencySafe(trade.riskMoney);
  return pctLabel || 'No registrado';
}

export function compactShareText(value, max = 92) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function getTradeResultLabel(trade) {
  const r = Number(trade.resultR || 0), pl = Number(trade.resultMoney || 0);
  if (r > 0) return `+${r.toFixed(2)}R`;
  if (r < 0) return `${r.toFixed(2)}R`;
  if (pl > 0) return 'Profit';
  if (pl < 0) return 'Stop Loss';
  return 'BE';
}

function getTradeDirectionLabel(trade) {
  const side = String(trade.side || trade.direction || '').toUpperCase();
  return side === 'SELL' || side === 'SHORT' ? 'SHORT' : 'LONG';
}

function formatTradeDateForShare(value) { return formatDateLabel(String(value || today()).slice(0, 10)); }

export function normalizeTradeForShare(trade = {}, privacy = {}) {
  const t = normalizeTradeForExport(trade);
  const behaviorScore = Number(trade.behaviorScore || behaviorScoreFromTrade(trade) || 0);
  return {
    symbol: t.symbol || trade.asset || 'Trade',
    direction: getTradeDirectionLabel(trade),
    date: String(t.tradingDay || t.date || trade.date || today()).slice(0, 10),
    session: t.session || '',
    setup: t.setup || t.pattern || normalizeTradeSetup(trade) || '',
    result: getTradeResultLabel(trade),
    resultR: Number(trade.resultR || 0),
    profitLossMoney: privacy.hideMoney ? null : Number(trade.resultMoney || 0),
    riskLabel: getTradeRiskLabel(trade, privacy),
    entry: privacy.hidePrices ? null : trade.entry,
    stopLoss: privacy.hidePrices ? null : trade.sl,
    takeProfit: privacy.hidePrices ? null : trade.tp,
    exit: privacy.hidePrices ? null : trade.exit,
    rr: trade.rr || trade.plannedRR || trade.rrPlanned || '',
    quality: trade.quality || '',
    behaviorScore,
    behaviorLabel: trade.behaviorScoreLabel || behaviorScoreLabel(behaviorScore),
    followedPlan: trade.followedPlan,
    checklistScore: trade.checklistScore || trade.checklistValidation?.score || '',
    checklistGreen: trade.checklistFinalGreen === true || trade.checklistValidation?.finalGreen === true,
    note: privacy.hideNote ? '' : (trade.lesson || trade.notes || trade.privateJournal || ''),
    tags: safeArray(trade.tags),
    footer: 'Process over outcome.'
  };
}

export function normalizeDailyStatsForShare(trades = [], date, plan = {}, privacy = {}) {
  const stats = calculateDailyTradeStats(trades);
  return {
    date: String(date || today()).slice(0, 10),
    ...stats,
    netPL: privacy.hideMoney ? null : stats.netPL,
    avgRisk: privacy.hideMoney ? null : stats.avgRisk,
    maxRisk: privacy.hideMoney ? null : stats.maxRisk,
    note: plan?.notes || plan?.reflection || '',
    dayBias: plan?.bias || '',
    emotion: plan?.emotion || '',
    footer: 'La cuenta puede cerrar en rojo y la conducta en verde.'
  };
}

function canUseNativeShare(file) { return !!(navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))); }

export async function shareImageFile(blob, filename, title = 'MTC Analytics') {
  const file = new File([blob], filename, { type: 'image/png' });
  if (canUseNativeShare(file)) {
    await navigator.share({ files: [file], title, text: 'MTC Analytics review' });
    return true;
  }
  return false;
}

function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '', lines = [];
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), `${lines.slice(maxLines - 1).join(' ').slice(0, 72).trim()}...`];
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + (i * lineHeight)));
  return y + (lines.length * lineHeight);
}

const BRAND_LOGO_HORIZONTAL = '/brand/mtc-analytics-logo-horizontal.png';
const BRAND_ICON = '/brand/mtc-analytics-icon.png';
const BRAND_SIGNATURE_LOGO = '/brand/Logolading.png';
const storyAssetCache = {};

function loadStoryImage(src) {
  if (storyAssetCache[src]) return storyAssetCache[src];
  storyAssetCache[src] = new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  return storyAssetCache[src];
}

function drawSoftEllipse(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(rx, ry);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStoryGrid(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.022)';
  ctx.lineWidth = 1;
  for (let x = 110; x < 1080; x += 132) { ctx.beginPath(); ctx.moveTo(x, 230); ctx.lineTo(x, 1660); ctx.stroke(); }
  for (let y = 270; y < 1680; y += 132) { ctx.beginPath(); ctx.moveTo(78, y); ctx.lineTo(1002, y); ctx.stroke(); }
  ctx.restore();
}

function drawLogoImage(ctx, img, x, y, w) {
  if (!img) return false;
  const ratio = img.height / img.width;
  ctx.drawImage(img, x, y, w, w * ratio);
  return true;
}

function drawMiniCard(ctx, x, y, w, h, label, value, accent = 'rgba(245,201,91,.86)') {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.052)');
  g.addColorStop(1, 'rgba(255,255,255,.018)');
  drawRoundedRect(ctx, x, y, w, h, 30, g, 'rgba(255,255,255,.060)');
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.fillStyle = accent;
  ctx.globalAlpha = .46;
  ctx.fillRect(x + 28, y + 24, 26, 3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(203,213,225,.78)';
  ctx.font = '850 18px Manrope, Inter, Arial';
  ctx.fillText(label, x + 28, y + 39);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 31px Manrope, Inter, Arial';
  drawWrappedText(ctx, String(value), x + 28, y + 70, w - 56, 34, 1);
  ctx.restore();
}

function drawEditorialBlock(ctx, x, y, w, kicker, body, maxLines = 3) {
  ctx.fillStyle = 'rgba(245,201,91,.82)';
  ctx.font = '900 20px Manrope, Inter, Arial';
  ctx.fillText(kicker, x, y);
  ctx.fillStyle = 'rgba(219,228,240,.90)';
  ctx.font = '700 26px Manrope, Inter, Arial';
  return drawWrappedText(ctx, body || 'N/A', x, y + 44, w, 35, maxLines);
}

function drawSignatureLogo(ctx, img) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = .70;
  const w = 174, ratio = img.height / img.width, h = w * ratio;
  ctx.drawImage(img, 828, 1716, w, h);
  ctx.restore();
}

function drawMainPosterPanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.34)';
  ctx.shadowBlur = 38;
  ctx.shadowOffsetY = 22;
  const shell = ctx.createLinearGradient(x, y, x + w, y + h);
  shell.addColorStop(0, 'rgba(255,255,255,.060)');
  shell.addColorStop(.55, 'rgba(255,255,255,.026)');
  shell.addColorStop(1, 'rgba(255,255,255,.016)');
  drawRoundedRect(ctx, x, y, w, h, 56, shell, 'rgba(212,168,67,.30)');
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.055)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x + 14, y + 14, w - 28, h - 28, 44, null, 'rgba(255,255,255,.065)');
  ctx.restore();
}

function drawDiagonalPanel(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1080, 250);
  ctx.lineTo(1080, 760);
  ctx.lineTo(0, 1260);
  ctx.lineTo(0, 780);
  ctx.closePath();
  const g = ctx.createLinearGradient(980, 260, 70, 1220);
  g.addColorStop(0, 'rgba(212,168,67,.095)');
  g.addColorStop(.55, 'rgba(255,255,255,.018)');
  g.addColorStop(1, 'rgba(37,99,180,.040)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawSectionCard(ctx, x, y, w, h, kicker, title, body) {
  drawRoundedRect(ctx, x, y, w, h, 30, 'rgba(255,255,255,.036)', 'rgba(212,168,67,.115)');
  ctx.fillStyle = 'rgba(245,201,91,.82)';
  ctx.font = '900 22px Manrope, Inter, Arial';
  ctx.fillText(kicker, x + 32, y + 48);
  if (title) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 30px Manrope, Inter, Arial';
    drawWrappedText(ctx, title, x + 32, y + 92, w - 64, 36, 2);
  }
  if (body) {
    ctx.fillStyle = 'rgba(219,228,240,.88)';
    ctx.font = '700 28px Manrope, Inter, Arial';
    drawWrappedText(ctx, body, x + 32, y + (title ? 164 : 92), w - 64, 36, title ? 3 : 4);
  }
}

async function drawStoryBase(ctx, title, date) {
  const [logo, icon] = await Promise.all([loadStoryImage(BRAND_LOGO_HORIZONTAL), loadStoryImage(BRAND_ICON)]);
  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
  grad.addColorStop(0, '#07111f');
  grad.addColorStop(.48, '#08111d');
  grad.addColorStop(1, '#03060b');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1920);
  drawSoftEllipse(ctx, 850, 96, 480, 285, 'rgba(212,168,67,.095)', -.30);
  drawSoftEllipse(ctx, 168, 1538, 520, 610, 'rgba(20,38,68,.52)', .15);
  drawSoftEllipse(ctx, 960, 1360, 260, 560, 'rgba(56,105,165,.040)', .42);
  drawDiagonalPanel(ctx);
  drawStoryGrid(ctx);
  if (icon) {
    ctx.save();
    ctx.globalAlpha = .040;
    ctx.translate(535, 1030);
    ctx.rotate(-.12);
    ctx.drawImage(icon, 0, 0, 720, 720);
    ctx.restore();
  }
  drawRoundedRect(ctx, 54, 54, 972, 1812, 56, 'rgba(255,255,255,.010)', 'rgba(255,255,255,.050)');
  if (!drawLogoImage(ctx, logo, 92, 92, 226)) {
    ctx.fillStyle = '#d4a843'; ctx.font = '900 32px Manrope, Inter, Arial'; ctx.fillText('MTC Analytics', 92, 122);
  }
  ctx.fillStyle = 'rgba(226,232,240,.72)';
  ctx.font = '800 22px Manrope, Inter, Arial';
  ctx.fillText(title, 94, 170);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(226,232,240,.78)';
  ctx.font = '800 24px Manrope, Inter, Arial';
  ctx.fillText(formatTradeDateForShare(date), 986, 118);
  ctx.fillStyle = 'rgba(245,201,91,.72)';
  ctx.font = '900 17px Manrope, Inter, Arial';
  ctx.fillText('REVISIÓN OPERATIVA', 986, 153);
  ctx.textAlign = 'left';
}

export async function renderTradeStoryPng(trade, privacy = {}) {
  const t = normalizeTradeForShare(trade, privacy);
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  await drawStoryBase(ctx, 'Revisión del trade', t.date);
  const signature = await loadStoryImage(BRAND_SIGNATURE_LOGO);
  drawMainPosterPanel(ctx, 86, 252, 908, 1250);
  ctx.fillStyle = 'rgba(245,201,91,.82)';
  ctx.font = '900 19px Manrope, Inter, Arial';
  ctx.fillText('RESUMEN OPERATIVO', 126, 338);
  ctx.fillStyle = '#fff7e6'; ctx.font = '900 116px Manrope, Inter, Arial'; ctx.fillText(t.symbol, 126, 462);
  const dirColor = t.direction === 'LONG' ? '#86efac' : '#fda4af';
  drawRoundedRect(ctx, 132, 508, 176, 58, 24, t.direction === 'LONG' ? 'rgba(34,197,94,.12)' : 'rgba(244,63,94,.12)', t.direction === 'LONG' ? 'rgba(34,197,94,.30)' : 'rgba(244,63,94,.30)');
  ctx.fillStyle = dirColor; ctx.font = '900 27px Manrope, Inter, Arial'; ctx.fillText(t.direction, 166, 546);
  ctx.fillStyle = t.resultR > 0 ? '#86efac' : t.resultR < 0 ? '#fda4af' : '#93c5fd'; ctx.font = '900 130px Manrope, Inter, Arial'; ctx.textAlign = 'right'; ctx.fillText(t.result, 944, 555); ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(226,232,240,.80)'; ctx.font = '700 27px Manrope, Inter, Arial'; drawWrappedText(ctx, [t.session, t.setup].filter(Boolean).join(' · '), 126, 640, 820, 36, 2);
  const metrics = [
    ['P/L', t.profitLossMoney == null ? 'Privado' : formatCurrencySafe(t.profitLossMoney)],
    ['Riesgo', t.riskLabel || 'No registrado'],
    ['Calidad', t.quality || 'N/A'],
    ['Conducta', `${Math.round(t.behaviorScore || 0)}/100`]
  ];
  metrics.forEach((m, i) => drawMiniCard(ctx, 126 + (i % 2) * 420, 784 + Math.floor(i / 2) * 154, 360, 112, m[0], m[1], i === 0 ? (t.resultR >= 0 ? '#86efac' : '#fda4af') : 'rgba(245,201,91,.72)'));
  let cursorY = 1162;
  if (!privacy.hidePrices) {
    const priceLine = `Entrada ${t.entry || 'N/A'} · SL ${t.stopLoss || 'N/A'} · TP ${t.takeProfit || 'N/A'}${t.exit ? ` · Salida ${t.exit}` : ''}`;
    cursorY = drawEditorialBlock(ctx, 126, cursorY, 828, 'MAPA DE PRECIOS', priceLine, 2) + 64;
  } else {
    cursorY = drawEditorialBlock(ctx, 126, cursorY, 828, 'MAPA DE PRECIOS', 'Privado', 1) + 64;
  }
  const processBody = t.behaviorLabel || t.postTradeBehavior || (t.checklistGreen ? 'Luz verde operativa' : 'Ejecución registrada');
  cursorY = drawEditorialBlock(ctx, 126, cursorY, 828, 'PROCESO', processBody, 1) + 66;
  if (t.note) {
    cursorY = drawEditorialBlock(ctx, 126, cursorY, 828, 'NOTA', compactShareText(t.note, 96), 1) + 62;
  }
  const footerY = Math.max(cursorY + 30, 1630);
  ctx.fillStyle = 'rgba(245,201,91,.78)'; ctx.font = '900 26px Manrope, Inter, Arial'; ctx.fillText('Ejecución documentada. Performance revisable.', 126, footerY);
  ctx.fillStyle = 'rgba(203,213,225,.66)'; ctx.font = '700 22px Manrope, Inter, Arial'; ctx.fillText('Contexto, riesgo, ejecución y revisión en una sola lectura.', 126, footerY + 40);
  ctx.fillStyle = 'rgba(148,163,184,.62)'; ctx.font = '700 19px Manrope, Inter, Arial'; ctx.fillText('MTC Analytics · Trading Performance Platform', 126, 1774);
  drawSignatureLogo(ctx, signature);
  return toCanvasBlob(canvas);
}

export async function renderDailyStoryPng(stats) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  await drawStoryBase(ctx, 'Resumen del día', stats.date);
  const signature = await loadStoryImage(BRAND_SIGNATURE_LOGO);
  drawMainPosterPanel(ctx, 86, 252, 908, 1250);
  ctx.fillStyle = 'rgba(245,201,91,.82)'; ctx.font = '900 19px Manrope, Inter, Arial'; ctx.fillText('RESUMEN OPERATIVO', 126, 338);
  ctx.fillStyle = '#fff7e6'; ctx.font = '900 78px Manrope, Inter, Arial'; ctx.fillText('Resumen del día', 126, 436);
  ctx.fillStyle = stats.netR > 0 ? '#86efac' : stats.netR < 0 ? '#fda4af' : '#93c5fd'; ctx.font = '900 132px Manrope, Inter, Arial'; ctx.fillText(formatRShare(stats.netR), 126, 585);
  ctx.textAlign = 'right'; ctx.fillStyle = Number(stats.netPL) > 0 ? '#86efac' : Number(stats.netPL) < 0 ? '#fda4af' : '#cbd5e1'; ctx.font = '900 54px Manrope, Inter, Arial'; ctx.fillText(stats.netPL == null ? 'P/L privado' : formatCurrencySafe(stats.netPL), 942, 558); ctx.textAlign = 'left';
  const rows = [
    ['Operaciones', stats.totalTrades],
    ['Efectividad', formatPercentageSafe(stats.winRate)],
    ['Gan. / Pérd. / BE', `${stats.wins}/${stats.losses}/${stats.breakevens}`],
    ['Promedio R', formatRShare(stats.avgR)],
    ['Mejor operación', formatRShare(stats.bestR)],
    ['Peor operación', formatRShare(stats.worstR)]
  ];
  rows.forEach((m, i) => drawMiniCard(ctx, 126 + (i % 2) * 420, 742 + Math.floor(i / 2) * 142, 360, 106, m[0], m[1], i === 1 ? '#93c5fd' : 'rgba(245,201,91,.72)'));
  let cursorY = 1178;
  cursorY = drawEditorialBlock(ctx, 126, cursorY, 828, 'PROCESO DEL DÍA',
    [stats.topSetup && `Setup: ${stats.topSetup}`, stats.mainSession && `Sesion: ${stats.mainSession}`, stats.behaviorScore ? `Conducta promedio: ${Math.round(stats.behaviorScore)}/100` : '', stats.dayBias && `Sesgo: ${stats.dayBias}`].filter(Boolean).join(' · ') || 'Sin datos de proceso cargados.',
    3
  ) + 66;
  if (stats.note) { cursorY = drawEditorialBlock(ctx, 126, cursorY, 828, 'NOTA DEL DÍA', compactShareText(stats.note, 104), 2) + 62; }
  const footerY = Math.max(cursorY + 30, 1630);
  ctx.fillStyle = 'rgba(245,201,91,.78)'; ctx.font = '900 26px Manrope, Inter, Arial'; drawWrappedText(ctx, 'La jornada se registra. La performance se interpreta.', 126, footerY, 828, 34, 2);
  ctx.fillStyle = 'rgba(203,213,225,.66)'; ctx.font = '700 22px Manrope, Inter, Arial'; ctx.fillText('Resultado, riesgo y proceso en una sola lectura.', 126, footerY + 78);
  ctx.fillStyle = 'rgba(148,163,184,.62)'; ctx.font = '700 19px Manrope, Inter, Arial'; ctx.fillText('MTC Analytics · Trading Performance Platform', 126, 1774);
  drawSignatureLogo(ctx, signature);
  return toCanvasBlob(canvas);
}
