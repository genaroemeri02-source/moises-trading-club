/**
 * Sprint 11 — Risk Settings store
 * Firestore path: users/{uid}/riskSettings/{accountId|default}
 * Local cache: mtc-risk-settings (+ per-account keys)
 * Keeps legacy UI shape (maxDailyLoss, maxTradesDay, …) and ops aliases.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeFirestoreObject, normalizedAccounts } from './tradeUtils.js';

export const RISK_SETTINGS_EVENT = 'mtc-risk-settings-updated';
export const RISK_SETTINGS_LOCAL_KEY = 'mtc-risk-settings';
export const RISK_SETTINGS_DEFAULT_ACCOUNT_ID = 'default';

/** UI / Risk Lab defaults (maxTradesDay: 3 matches current Risk UI). */
export const RISK_SETTINGS_DEFAULTS = Object.freeze({
  maxDailyLoss: 300,
  maxWeeklyLoss: 900,
  maxTradesDay: 3,
  maxTradesPerDay: 3,
  maxDrawdownPct: 5,
  riskPerTradePct: 0.5,
  accountCapital: 10000,
  capital: 10000,
  riskPct: 0.5,
  dailyLossLimit: 300,
  weeklyLossLimit: 900,
  dailyLossLimitR: -1,
  weeklyLossLimitR: -3,
  currency: 'USD',
  source: 'default'
});

function finiteOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function slugAccountId(value) {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return raw || RISK_SETTINGS_DEFAULT_ACCOUNT_ID;
}

/**
 * Resolve Firestore/local account id from active account filter + trading settings.
 * `__all__` / empty → `default`. Prefer account.id when name matches.
 */
export function resolveRiskAccountId(activeAccount, tradingSettings = {}) {
  const active = String(activeAccount || '').trim();
  if (!active || active === '__all__' || active === 'Todas' || active === 'Todas las cuentas') {
    return RISK_SETTINGS_DEFAULT_ACCOUNT_ID;
  }
  const accounts = normalizedAccounts(tradingSettings);
  const byId = accounts.find(a => a.id === active);
  if (byId?.id) return String(byId.id);
  const byName = accounts.find(a => String(a.name || '').trim() === active);
  if (byName?.id) return String(byName.id);
  return slugAccountId(active);
}

export function resolveRiskAccountName(activeAccount, tradingSettings = {}, accountId = RISK_SETTINGS_DEFAULT_ACCOUNT_ID) {
  const active = String(activeAccount || '').trim();
  if (!active || active === '__all__') {
    if (accountId === RISK_SETTINGS_DEFAULT_ACCOUNT_ID) return '';
  }
  const accounts = normalizedAccounts(tradingSettings);
  const byId = accounts.find(a => a.id === accountId);
  if (byId?.name) return String(byId.name);
  if (active && active !== '__all__') return active;
  return '';
}

export function localRiskSettingsKey(accountId) {
  const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID).trim() || RISK_SETTINGS_DEFAULT_ACCOUNT_ID;
  if (id === RISK_SETTINGS_DEFAULT_ACCOUNT_ID) return RISK_SETTINGS_LOCAL_KEY;
  return `${RISK_SETTINGS_LOCAL_KEY}:${id}`;
}

export function mergeRiskSettingsWithDefaults(settings = {}) {
  return normalizeRiskSettings(settings, RISK_SETTINGS_DEFAULTS);
}

/**
 * Normalize any legacy / Firestore / local shape into a dual-compatible object.
 * Preserves both UI keys (maxTradesDay) and ops keys (maxTradesPerDay).
 */
export function normalizeRiskSettings(settings = {}, fallback = RISK_SETTINGS_DEFAULTS) {
  const src = { ...asObject(fallback), ...asObject(settings) };

  const capital = finiteOrNull(src.capital ?? src.accountCapital ?? src.initialBalance);
  const riskPct = finiteOrNull(src.riskPct ?? src.riskPerTradePct);
  const maxDailyLoss = finiteOrNull(src.maxDailyLoss ?? src.dailyLossLimit);
  const maxWeeklyLoss = finiteOrNull(src.maxWeeklyLoss ?? src.weeklyLossLimit);
  const maxTradesRaw = finiteOrNull(src.maxTradesPerDay ?? src.maxTradesDay ?? src.maxTrades);
  const maxDrawdownPct = finiteOrNull(src.maxDrawdownPct ?? src.drawdownLimitPct);
  const dailyLossLimitR = finiteOrNull(src.dailyLossLimitR ?? src.maxDailyLossR ?? src.maxDailyR);
  const weeklyLossLimitR = finiteOrNull(src.weeklyLossLimitR ?? src.maxWeeklyLossR ?? src.maxWeeklyR);

  const maxTrades = maxTradesRaw != null && maxTradesRaw >= 0 ? Math.floor(maxTradesRaw) : Number(fallback.maxTradesDay ?? 3);

  const out = {
    accountId: src.accountId != null ? String(src.accountId) : (fallback.accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID),
    accountName: src.accountName != null ? String(src.accountName) : (fallback.accountName || ''),
    capital: capital != null && capital > 0 ? capital : Number(fallback.capital ?? fallback.accountCapital ?? 10000),
    accountCapital: capital != null && capital > 0 ? capital : Number(fallback.accountCapital ?? fallback.capital ?? 10000),
    riskPct: riskPct != null ? riskPct : Number(fallback.riskPct ?? fallback.riskPerTradePct ?? 0.5),
    riskPerTradePct: riskPct != null ? riskPct : Number(fallback.riskPerTradePct ?? fallback.riskPct ?? 0.5),
    maxDailyLoss: maxDailyLoss != null && maxDailyLoss >= 0 ? maxDailyLoss : Number(fallback.maxDailyLoss ?? 300),
    dailyLossLimit: maxDailyLoss != null && maxDailyLoss >= 0 ? maxDailyLoss : Number(fallback.dailyLossLimit ?? fallback.maxDailyLoss ?? 300),
    maxWeeklyLoss: maxWeeklyLoss != null && maxWeeklyLoss >= 0 ? maxWeeklyLoss : Number(fallback.maxWeeklyLoss ?? 900),
    weeklyLossLimit: maxWeeklyLoss != null && maxWeeklyLoss >= 0 ? maxWeeklyLoss : Number(fallback.weeklyLossLimit ?? fallback.maxWeeklyLoss ?? 900),
    maxTradesDay: maxTrades,
    maxTradesPerDay: maxTrades,
    maxDrawdownPct: maxDrawdownPct != null && maxDrawdownPct > 0 ? maxDrawdownPct : Number(fallback.maxDrawdownPct ?? 5),
    dailyLossLimitR: dailyLossLimitR != null
      ? (dailyLossLimitR <= 0 ? dailyLossLimitR : -Math.abs(dailyLossLimitR))
      : Number(fallback.dailyLossLimitR ?? -1),
    weeklyLossLimitR: weeklyLossLimitR != null
      ? (weeklyLossLimitR <= 0 ? weeklyLossLimitR : -Math.abs(weeklyLossLimitR))
      : Number(fallback.weeklyLossLimitR ?? -3),
    currency: String(src.currency || fallback.currency || 'USD'),
    source: String(src.source || fallback.source || 'default'),
    updatedAt: src.updatedAt ?? fallback.updatedAt ?? null,
    createdAt: src.createdAt ?? fallback.createdAt ?? null
  };

  if (src.confirmed === true) out.confirmed = true;
  return out;
}

function emitRiskSettingsUpdated(detail = {}) {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(RISK_SETTINGS_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}

export function getLocalRiskSettings(accountId = RISK_SETTINGS_DEFAULT_ACCOUNT_ID) {
  const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID);
  try {
    if (typeof localStorage === 'undefined') {
      return mergeRiskSettingsWithDefaults({ accountId: id, source: 'default' });
    }
    const keyed = localStorage.getItem(localRiskSettingsKey(id));
    if (keyed) {
      return normalizeRiskSettings(
        { ...JSON.parse(keyed), accountId: id, source: 'local' },
        RISK_SETTINGS_DEFAULTS
      );
    }
    // Legacy global key as fallback for any account (migration-friendly).
    if (id !== RISK_SETTINGS_DEFAULT_ACCOUNT_ID) {
      const legacy = localStorage.getItem(RISK_SETTINGS_LOCAL_KEY);
      if (legacy) {
        return normalizeRiskSettings(
          { ...JSON.parse(legacy), accountId: id, source: 'local' },
          RISK_SETTINGS_DEFAULTS
        );
      }
    } else {
      const legacy = localStorage.getItem(RISK_SETTINGS_LOCAL_KEY);
      if (legacy) {
        return normalizeRiskSettings(
          { ...JSON.parse(legacy), accountId: id, source: 'local' },
          RISK_SETTINGS_DEFAULTS
        );
      }
    }
  } catch {
    /* fall through */
  }
  return mergeRiskSettingsWithDefaults({ accountId: id, source: 'default' });
}

export function saveLocalRiskSettings(accountId, settings) {
  const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID);
  const normalized = normalizeRiskSettings(
    { ...asObject(settings), accountId: id, source: 'local' },
    RISK_SETTINGS_DEFAULTS
  );
  const payload = {
    accountId: normalized.accountId,
    accountName: normalized.accountName,
    maxDailyLoss: normalized.maxDailyLoss,
    maxWeeklyLoss: normalized.maxWeeklyLoss,
    maxTradesDay: normalized.maxTradesDay,
    maxTradesPerDay: normalized.maxTradesPerDay,
    maxDrawdownPct: normalized.maxDrawdownPct,
    riskPerTradePct: normalized.riskPerTradePct,
    accountCapital: normalized.accountCapital,
    capital: normalized.capital,
    riskPct: normalized.riskPct,
    dailyLossLimit: normalized.dailyLossLimit,
    weeklyLossLimit: normalized.weeklyLossLimit,
    dailyLossLimitR: normalized.dailyLossLimitR,
    weeklyLossLimitR: normalized.weeklyLossLimitR,
    currency: normalized.currency,
    source: 'local',
    updatedAt: new Date().toISOString()
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(localRiskSettingsKey(id), JSON.stringify(payload));
      // Keep legacy key in sync for default account (sharePng / older readers).
      if (id === RISK_SETTINGS_DEFAULT_ACCOUNT_ID) {
        localStorage.setItem(RISK_SETTINGS_LOCAL_KEY, JSON.stringify(payload));
      }
    }
  } catch {
    /* ignore quota / private mode */
  }
  emitRiskSettingsUpdated({ accountId: id, source: 'local', settings: normalized });
  return normalized;
}

export function hasLocalRiskSettings(accountId = RISK_SETTINGS_DEFAULT_ACCOUNT_ID) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID);
    if (localStorage.getItem(localRiskSettingsKey(id))) return true;
    if (localStorage.getItem(RISK_SETTINGS_LOCAL_KEY)) return true;
    return false;
  } catch {
    return false;
  }
}

export function getRiskSettingsDocRef(db, uid, accountId) {
  if (!db || !uid) return null;
  const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID).trim() || RISK_SETTINGS_DEFAULT_ACCOUNT_ID;
  try {
    return doc(db, 'users', String(uid), 'riskSettings', id);
  } catch {
    return null;
  }
}

function buildFirestorePayload({ accountId, accountName, settings, isCreate }) {
  const n = normalizeRiskSettings(
    { ...asObject(settings), accountId, accountName, source: 'firestore' },
    RISK_SETTINGS_DEFAULTS
  );
  const payload = sanitizeFirestoreObject({
    accountId: String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID),
    accountName: String(accountName || ''),
    capital: n.capital,
    accountCapital: n.accountCapital,
    riskPct: n.riskPct,
    riskPerTradePct: n.riskPerTradePct,
    dailyLossLimit: n.dailyLossLimit,
    weeklyLossLimit: n.weeklyLossLimit,
    maxDailyLoss: n.maxDailyLoss,
    maxWeeklyLoss: n.maxWeeklyLoss,
    maxDrawdownPct: n.maxDrawdownPct,
    maxTradesPerDay: n.maxTradesPerDay,
    maxTradesDay: n.maxTradesDay,
    dailyLossLimitR: n.dailyLossLimitR,
    weeklyLossLimitR: n.weeklyLossLimitR,
    currency: n.currency || 'USD',
    source: 'firestore',
    updatedAt: serverTimestamp()
  });
  if (isCreate) payload.createdAt = serverTimestamp();
  return payload;
}

/**
 * Load risk settings: Firestore → local (per-account / legacy) → defaults.
 * Never throws; always returns a usable settings object.
 */
export async function loadRiskSettings({
  db = null,
  uid = null,
  accountId = RISK_SETTINGS_DEFAULT_ACCOUNT_ID,
  accountName = ''
} = {}) {
  const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID);
  const local = getLocalRiskSettings(id);

  if (!db || !uid) {
    return {
      settings: normalizeRiskSettings(
        { ...local, accountId: id, accountName: accountName || local.accountName },
        RISK_SETTINGS_DEFAULTS
      ),
      source: local.source === 'local' ? 'local' : 'default',
      fromFirestore: false
    };
  }

  try {
    const ref = getRiskSettingsDocRef(db, uid, id);
    if (!ref) {
      return { settings: local, source: local.source || 'local', fromFirestore: false };
    }
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = normalizeRiskSettings(
        {
          ...snap.data(),
          accountId: id,
          accountName: accountName || snap.data()?.accountName || local.accountName,
          source: 'firestore'
        },
        RISK_SETTINGS_DEFAULTS
      );
      // Refresh local cache without re-emitting a confusing loop for callers that just loaded.
      try {
        const cachePayload = { ...remote, source: 'local', updatedAt: new Date().toISOString() };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(localRiskSettingsKey(id), JSON.stringify(cachePayload));
          if (id === RISK_SETTINGS_DEFAULT_ACCOUNT_ID) {
            localStorage.setItem(RISK_SETTINGS_LOCAL_KEY, JSON.stringify(cachePayload));
          }
        }
      } catch {
        /* ignore */
      }
      return { settings: remote, source: 'firestore', fromFirestore: true };
    }
  } catch (err) {
    console.warn('loadRiskSettings firestore fallback', err?.message || err);
  }

  return {
    settings: normalizeRiskSettings(
      { ...local, accountId: id, accountName: accountName || local.accountName },
      RISK_SETTINGS_DEFAULTS
    ),
    source: local.source === 'local' ? 'local' : 'default',
    fromFirestore: false
  };
}

/**
 * Save to local always; Firestore when db+uid available.
 * Returns { settings, source, synced, error? }.
 */
export async function saveRiskSettings({
  db = null,
  uid = null,
  accountId = RISK_SETTINGS_DEFAULT_ACCOUNT_ID,
  accountName = '',
  settings = {}
} = {}) {
  const id = String(accountId || RISK_SETTINGS_DEFAULT_ACCOUNT_ID);
  const withMeta = {
    ...asObject(settings),
    accountId: id,
    accountName: accountName || settings.accountName || ''
  };

  // Always persist local cache first (safe fallback).
  const localSaved = saveLocalRiskSettings(id, withMeta);

  if (!db || !uid) {
    return {
      settings: localSaved,
      source: 'local',
      synced: false,
      error: null
    };
  }

  try {
    const ref = getRiskSettingsDocRef(db, uid, id);
    if (!ref) {
      return { settings: localSaved, source: 'local', synced: false, error: 'no_ref' };
    }
    const existing = await getDoc(ref);
    const payload = buildFirestorePayload({
      accountId: id,
      accountName: accountName || withMeta.accountName,
      settings: withMeta,
      isCreate: !existing.exists()
    });
    await setDoc(ref, payload, { merge: true });
    const synced = normalizeRiskSettings(
      { ...localSaved, ...withMeta, accountId: id, accountName: accountName || withMeta.accountName, source: 'firestore' },
      RISK_SETTINGS_DEFAULTS
    );
    emitRiskSettingsUpdated({ accountId: id, source: 'firestore', settings: synced });
    return { settings: synced, source: 'firestore', synced: true, error: null };
  } catch (err) {
    console.warn('saveRiskSettings firestore failed', err?.message || err);
    return {
      settings: localSaved,
      source: 'local',
      synced: false,
      error: err?.message || 'firestore_write_failed'
    };
  }
}
