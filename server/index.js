import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

dotenv.config();

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (b64) return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  if (json) return JSON.parse(json);
  return null;
}

const serviceAccount = getServiceAccount();
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

if (!admin.apps.length) {
  admin.initializeApp(serviceAccount ? {
    credential: admin.credential.cert(serviceAccount),
    projectId: firebaseProjectId,
  } : {
    credential: admin.credential.applicationDefault(),
    projectId: firebaseProjectId,
  });
}

const db = admin.firestore();




const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';
const APP_URL = (process.env.APP_URL || 'https://www.moisestradingclub.com').replace(/\/$/, '');
const DEFAULT_CURRENCY = 'USD';

const METAAPI_TOKEN = process.env.METAAPI_TOKEN || '';
const METAAPI_DEFAULT_REGION = process.env.METAAPI_DEFAULT_REGION || 'new-york';

function getEncryptionKey() {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes hex');
  }
  return key;
}

function encryptSecret(text) {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

function decryptSecret(payload) {
  if (!payload) return '';
  const [ivHex, tagHex, encryptedHex] = String(payload).split(':');
  const key = getEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

function assertRequiredString(value, name) {
  if (!String(value || '').trim()) {
    const err = new Error(`${name}_required`);
    err.status = 400;
    throw err;
  }
  return String(value).trim();
}

function maskLogin(login = '') {
  const clean = String(login || '').trim();
  return clean.length <= 4 ? '****' : `****${clean.slice(-4)}`;
}

function normalizeAsset(symbol = '') {
  const clean = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const map = {
    XAUUSD: 'XAUUSD', GOLD: 'XAUUSD', XAU: 'XAUUSD',
    NAS100: 'NAS100', NASDAQ: 'NAS100', US100: 'NAS100', NDX: 'NAS100',
    US30: 'US30', DJ30: 'US30', DOW: 'US30',
    EURUSD: 'EURUSD', GBPUSD: 'GBPUSD', USDJPY: 'USDJPY',
    BTCUSD: 'BTCUSD', ETHUSD: 'ETHUSD'
  };
  return map[clean] || clean;
}

function sessionFromTime(isoTime) {
  if (!isoTime) return 'NY';
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return 'NY';
  const hour = Number(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }));
  if (hour < 3) return 'Asia';
  if (hour < 8) return 'Londres';
  if (hour < 13) return 'NY';
  if (hour < 17) return 'Post NY';
  return 'Rollover';
}

function dealTime(deal = {}) {
  const value = deal.time || deal.brokerTime || deal.updateTime || deal.doneTime || deal.closeTime || deal.openTime || null;
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function dealProfit(deal = {}) {
  return Number(deal.profit || deal.realizedProfit || 0) + Number(deal.commission || 0) + Number(deal.swap || 0);
}

function isBuyLike(type = '') { return String(type).toUpperCase().includes('BUY'); }
function isSellLike(type = '') { return String(type).toUpperCase().includes('SELL'); }
function isEntryLike(deal = {}) {
  const entryType = String(deal.entryType || deal.entry || '').toUpperCase();
  const type = String(deal.type || '').toUpperCase();
  return entryType.includes('IN') || type.includes('BUY') || type.includes('SELL');
}
function isExitLike(deal = {}) {
  const entryType = String(deal.entryType || deal.entry || '').toUpperCase();
  return entryType.includes('OUT') || Number(deal.profit || deal.realizedProfit || 0) !== 0;
}

function mapClosedMtTrade({ openDeal, closeDeal, positionId, userId, connectionId }) {
  const openType = String(openDeal.type || '').toUpperCase();
  const side = isBuyLike(openType) ? 'BUY' : isSellLike(openType) ? 'SELL' : 'BUY';
  const resultMoney = Number(closeDeal.profit || closeDeal.realizedProfit || 0) + Number(openDeal.commission || 0) + Number(closeDeal.commission || 0) + Number(openDeal.swap || 0) + Number(closeDeal.swap || 0);
  const openTime = dealTime(openDeal);
  const closeTime = dealTime(closeDeal);
  return {
    userId,
    tradingDay: closeTime?.slice(0, 10) || openTime?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    date: closeTime?.slice(0, 10) || openTime?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    asset: normalizeAsset(openDeal.symbol || closeDeal.symbol),
    side,
    entry: Number(openDeal.price || openDeal.openPrice || 0),
    exit: Number(closeDeal.price || closeDeal.closePrice || 0),
    sl: Number(openDeal.stopLoss || closeDeal.stopLoss || 0),
    tp: Number(openDeal.takeProfit || closeDeal.takeProfit || 0),
    result: resultMoney > 0 ? 'Profit' : resultMoney < 0 ? 'Stop' : 'BE',
    resultMoney,
    resultPct: 0,
    resultR: 0,
    riskMoney: 0,
    riskPct: 0,
    session: sessionFromTime(openTime),
    tradeSystem: 'Sistema de Moisés',
    quality: 'A',
    followedPlan: true,
    lotSize: Number(openDeal.volume || closeDeal.volume || 0),
    commission: Number(openDeal.commission || 0) + Number(closeDeal.commission || 0),
    swap: Number(openDeal.swap || 0) + Number(closeDeal.swap || 0),
    fees: Number(openDeal.commission || 0) + Number(closeDeal.commission || 0) + Number(openDeal.swap || 0) + Number(closeDeal.swap || 0),
    brokerTicket: String(closeDeal.id || closeDeal.ticket || positionId),
    brokerPositionId: String(positionId),
    brokerOrderId: String(openDeal.orderId || openDeal.order || ''),
    brokerSource: 'metaapi',
    brokerConnectionId: connectionId,
    openTime,
    closeTime,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    setup: 'Importado automáticamente desde MetaTrader Auto Sync',
    lesson: '',
    needsReview: true,
  };
}

function groupClosedTradesFromDeals(deals = [], userId, connectionId) {
  const groups = new Map();
  deals.forEach((deal) => {
    const positionId = String(deal.positionId || deal.position || deal.position_id || deal.orderId || deal.order || deal.id || deal.ticket || '');
    if (!positionId) return;
    if (!groups.has(positionId)) groups.set(positionId, []);
    groups.get(positionId).push(deal);
  });
  const trades = [];
  for (const [positionId, list] of groups.entries()) {
    const sorted = [...list].sort((a, b) => new Date(dealTime(a) || 0) - new Date(dealTime(b) || 0));
    const openDeal = sorted.find(isEntryLike) || sorted[0];
    const closeCandidates = sorted.filter((d) => d !== openDeal && (isExitLike(d) || dealProfit(d) !== 0));
    const closeDeal = closeCandidates.at(-1) || sorted.at(-1);
    if (!openDeal || !closeDeal || openDeal === closeDeal) continue;
    trades.push(mapClosedMtTrade({ openDeal, closeDeal, positionId, userId, connectionId }));
  }
  return trades;
}

async function getMetaApi() {
  if (!METAAPI_TOKEN) {
    const err = new Error('metaapi_token_missing');
    err.status = 500;
    throw err;
  }
  // Important: use the Node build of MetaApi SDK.
  // The package default ESM import resolves to the browser build and crashes in Node with `window is not defined`.
  const mod = await import('metaapi.cloud-sdk/esm-node');
  const MetaApi = mod.default || mod.MetaApi || mod;
  return new MetaApi(METAAPI_TOKEN, { region: METAAPI_DEFAULT_REGION });
}

async function createMetaApiAccount({ platform, brokerName, serverName, login, investorPassword, accountName }) {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.createAccount({
    name: accountName || `${brokerName || 'MTC'} ${maskLogin(login)}`,
    type: 'cloud',
    login,
    password: investorPassword,
    server: serverName,
    platform,
    application: 'MetaApi',
    magic: 777270,
    quoteStreamingIntervalInSeconds: 2.5,
    reliability: 'regular',
  });
  try { await account.deploy(); } catch (e) { console.warn('metaapi_deploy_warning', e?.message || e); }
  let status = 'pending';
  try {
    if (account.waitConnected) await account.waitConnected({ timeoutInSeconds: 90 });
    status = 'connected';
  } catch (e) {
    console.warn('metaapi_wait_connected_pending', e?.message || e);
  }
  return { accountId: account.id, status };
}

async function getMetaApiConnectionStatus(metaApiAccountId) {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);
  const state = account?.state || account?.connectionStatus || account?.deploymentState || '';
  let status = String(state).toLowerCase().includes('connect') ? 'connected' : 'pending';
  try {
    if (account.waitConnected) {
      await account.waitConnected({ timeoutInSeconds: 8 });
      status = 'connected';
    }
  } catch (e) {
    status = String(e?.message || '').toLowerCase().includes('auth') ? 'error' : status;
  }
  return { status, message: status === 'connected' ? 'MetaTrader conectado' : 'MetaApi sigue preparando la conexión' };
}

async function fetchMetaApiDeals(metaApiAccountId, fromDate, toDate) {
  const api = await getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);
  if (account.deploy) { try { await account.deploy(); } catch (e) {} }
  if (account.waitConnected) { try { await account.waitConnected({ timeoutInSeconds: 45 }); } catch (e) {} }
  const connection = account.getRPCConnection ? account.getRPCConnection() : await account.connect();
  if (connection.connect) await connection.connect();
  if (connection.waitSynchronized) await connection.waitSynchronized({ timeoutInSeconds: 90 });
  const from = new Date(fromDate || new Date(Date.now() - 365 * 86400000).toISOString());
  const to = new Date(toDate || new Date().toISOString());
  const result = await connection.getDealsByTimeRange(from, to);
  return Array.isArray(result) ? result : (result?.deals || result?.history || []);
}

async function syncConnectionDoc(docSnap, { fromDate, toDate } = {}) {
  const connection = docSnap.data();
  const uid = connection.userId;
  const connectionId = docSnap.id;
  const startedFrom = fromDate || connection.lastSyncAt?.toDate?.()?.toISOString?.() || connection.syncFromDate || new Date(Date.now() - 365 * 86400000).toISOString();
  const deals = await fetchMetaApiDeals(connection.metaApiAccountId, startedFrom, toDate || new Date().toISOString());
  const mapped = groupClosedTradesFromDeals(deals, uid, connectionId);
  let imported = 0;
  let skipped = 0;
  const errors = [];
  for (const trade of mapped) {
    try {
      let existing = await db.collection('trades')
        .where('userId', '==', uid)
        .where('brokerSource', '==', 'metaapi')
        .where('brokerPositionId', '==', String(trade.brokerPositionId || ''))
        .limit(1)
        .get();
      if (existing.empty && trade.brokerTicket) {
        existing = await db.collection('trades')
          .where('userId', '==', uid)
          .where('brokerSource', '==', 'metaapi')
          .where('brokerTicket', '==', String(trade.brokerTicket))
          .limit(1)
          .get();
      }
      if (!existing.empty) { skipped++; continue; }
      await db.collection('trades').add({ ...trade, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      imported++;
    } catch (e) {
      errors.push({ ticket: trade.brokerTicket || trade.brokerPositionId || '', error: e.message || String(e) });
    }
  }
  await docSnap.ref.set({
    lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSyncStatus: errors.length ? 'error' : 'ok',
    lastSyncError: errors.length ? JSON.stringify(errors).slice(0, 900) : null,
    connectionStatus: 'connected',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { imported, skipped, errors };
}


const PAYPAL_BASE_URL =
  PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// Canonical order/pricing keys. Brand aliases club/pro accepted via resolveCheckoutPlanId.
// Fallbacks match commercialConfig (14.99 / 24.99). Env can override; do not invent secrets.
const PLAN_PRICING = {
  basic: { name: 'Club', monthly: Number(process.env.PLAN_BASIC_MONTHLY || 14.99), currency: 'USD' },
  premium: { name: 'Pro', monthly: Number(process.env.PLAN_PREMIUM_MONTHLY || 24.99), currency: 'USD' },
};

/** Brand → backend: club→basic, pro→premium. Unknown → null. */
function resolveCheckoutPlanId(planId) {
  const raw = String(planId || '').trim().toLowerCase();
  const map = { club: 'basic', basic: 'basic', pro: 'premium', premium: 'premium' };
  return map[raw] || null;
}

const BILLING_MONTHS = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

const ACCESS_CONTROL_FIELDS = {
  accessStatus: 'active',
  subscriptionStatus: 'active',
  accessSource: 'payment',
  paymentProvider: 'paypal',
  approved: true,
  status: 'approved',
};


const PLAN_ALIASES = { basic: 'club', premium: 'pro', mentorship: 'mentor', founder: 'club', alumno: 'free' };
function normalizeCommercialPlan(plan = 'free') {
  const raw = String(plan || 'free').toLowerCase();
  return PLAN_ALIASES[raw] || raw;
}
function defaultPlanFeatures(plan = 'free') {
  const p = normalizeCommercialPlan(plan);
  const base = { journal: true, checklist: true, analytics: false, riskGuard: false, mt5Sync: false, academy: true, community: true };
  if (p === 'club') return { ...base, analytics: true };
  if (p === 'pro' || p === 'mentor' || p === 'admin') return { ...base, analytics: true, riskGuard: true, mt5Sync: true };
  if (p === 'influencer_trial') return { ...base, analytics: true, riskGuard: true, mt5Sync: false };
  return base;
}
function defaultPlanLimits(plan = 'free') {
  const p = normalizeCommercialPlan(plan);
  if (p === 'pro' || p === 'mentor' || p === 'admin') return { maxAccounts: 10, maxTradesPerMonth: 1000, mt5SyncEnabled: true, mt5SyncAccounts: p === 'pro' ? 1 : 3 };
  if (p === 'club' || p === 'influencer_trial') return { maxAccounts: 3, maxTradesPerMonth: 300, mt5SyncEnabled: false, mt5SyncAccounts: 0 };
  return { maxAccounts: 1, maxTradesPerMonth: 50, mt5SyncEnabled: false, mt5SyncAccounts: 0 };
}
function featureSet(profile = {}) {
  return { ...defaultPlanFeatures(profile.plan), ...(profile.features || {}) };
}
function isPrivilegedProfile(profile = {}) {
  const role = String(profile.role || '').toLowerCase();
  return ['admin', 'moderador', 'mentor', 'owner', 'fundador'].includes(role) || profile.isAdmin === true || profile.admin === true;
}
function timestampToMillis(value) {
  if (!value) return null;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
function hasActiveCommercialAccess(profile = {}) {
  if (!profile) return false;
  if (isPrivilegedProfile(profile)) return true;
  if (profile.accessStatus === 'blocked' || ['denied', 'suspended'].includes(profile.status)) return false;
  const endMs = timestampToMillis(profile.currentPeriodEnd || profile.trialEndsAt);
  if (endMs && endMs <= Date.now() && profile.accessStatus !== 'manual_approved') return false;
  if (profile.accessStatus === 'active' || profile.accessStatus === 'manual_approved' || profile.subscriptionStatus === 'active') return true;
  return profile.approved === true || profile.status === 'approved';
}
function canUseFeature(profile = {}, feature) {
  if (!feature) return false;
  if (isPrivilegedProfile(profile)) return true;
  if (!hasActiveCommercialAccess(profile)) return false;
  return featureSet(profile)[feature] === true;
}
function makeCommercialAccessPatch(plan, { source = 'admin', features = null, limits = null, days = null, provider = null } = {}) {
  const normalized = normalizeCommercialPlan(plan);
  const mergedFeatures = { ...defaultPlanFeatures(normalized), ...(features || {}) };
  const mergedLimits = { ...defaultPlanLimits(normalized), ...(limits || {}) };
  const now = new Date();
  const patch = {
    plan: normalized,
    accessStatus: normalized === 'admin' ? 'manual_approved' : 'active',
    subscriptionStatus: normalized === 'free' ? 'none' : 'active',
    accessSource: source,
    approved: true,
    status: 'approved',
    active: true,
    features: mergedFeatures,
    limits: mergedLimits,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (provider) patch.paymentProvider = provider;
  if (days) {
    const end = new Date(now);
    end.setDate(end.getDate() + Number(days));
    patch.currentPeriodStart = admin.firestore.Timestamp.fromDate(now);
    patch.currentPeriodEnd = admin.firestore.Timestamp.fromDate(end);
    patch.trialEndsAt = admin.firestore.Timestamp.fromDate(end);
  }
  return patch;
}
async function getUserProfile(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { uid: snap.id, ...snap.data() } : null;
}
async function requireAdminUser(uid) {
  const profile = await getUserProfile(uid);
  if (!isPrivilegedProfile(profile)) {
    const err = new Error('admin_required');
    err.status = 403;
    throw err;
  }
  return profile;
}
async function requireFeatureForUser(uid, feature) {
  const profile = await getUserProfile(uid);
  if (!canUseFeature(profile, feature)) {
    const err = new Error(`${feature}_not_included_in_plan`);
    err.status = 403;
    throw err;
  }
  return profile;
}

function allowedOrigin(origin = '') {
  if (!origin) return true;
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  if (configured.length) return configured.includes(origin);
  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('moisestradingclub.com') ||
    origin === APP_URL
  );
}

function setCors(req, res) {
  const origin = req.get('origin') || '';
  if (allowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin || '*');
  }
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Paypal-Transmission-Id, Paypal-Transmission-Time, Paypal-Cert-Url, Paypal-Auth-Algo, Paypal-Transmission-Sig');
}

function handlePreflight(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function calculatePlanPrice(planId, billingCycle = 'monthly') {
  const plan = PLAN_PRICING[planId];
  if (!plan) throw new Error('invalid_plan');
  if (!BILLING_MONTHS[billingCycle]) throw new Error('invalid_billing_cycle');

  const monthly = plan.monthly;
  if (billingCycle === 'monthly') {
    return { total: monthly, regular: monthly, months: 1, currency: plan.currency, savePct: 0 };
  }

  if (billingCycle === 'quarterly') {
    const regular = monthly * 3;
    const total = regular * 0.8;
    return { total, regular, months: 3, currency: plan.currency, savePct: 20 };
  }

  const quarterlyTotal = monthly * 3 * 0.8;
  const regular = quarterlyTotal * 4;
  const total = regular * 0.9;
  return { total, regular, months: 12, currency: plan.currency, savePct: 10 };
}

function normalizeMoney(value) {
  return Number(value).toFixed(2);
}

async function requireUser(req) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    const err = new Error('missing_auth_token');
    err.status = 401;
    throw err;
  }
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (e) {
    const err = new Error('invalid_auth_token');
    err.status = 401;
    throw err;
  }
}

async function paypalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error('paypal_credentials_missing');

  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('paypal_token_error', payload);
    throw new Error('paypal_token_error');
  }

  return payload.access_token;
}

async function verifyPayPalWebhook(req) {
  const event = req.body || {};

  if (PAYPAL_ENV === 'sandbox') {
    console.warn('paypal_webhook_sandbox_received', {
      event_type: event.event_type || event.eventType || 'unknown',
      id: event.id || null,
    });

    return event;
  }

  if (!PAYPAL_WEBHOOK_ID) {
    const err = new Error('paypal_webhook_id_missing');
    err.status = 400;
    throw err;
  }

  const err = new Error('paypal_webhook_verification_not_configured');
  err.status = 400;
  throw err;
}


async function activateMembership({ uid, planId, billingCycle, paymentId, paypalOrderId, paypalCaptureId }) {
  const now = new Date();
  const months = BILLING_MONTHS[billingCycle] || 1;
  const end = addMonths(now, months);
  const planPrice = calculatePlanPrice(planId, billingCycle);

  const userRef = db.collection('users').doc(uid);
  const paymentRef = db.collection('payments').doc(paymentId);

  await db.runTransaction(async (tx) => {
    tx.set(
      userRef,
      {
        ...ACCESS_CONTROL_FIELDS,
        ...makeCommercialAccessPatch(planId, { source: 'paypal', provider: 'paypal' }),
        plan: planId,
        billingCycle,
        currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(end),
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
        expiredAt: admin.firestore.FieldValue.delete(),
        cancelAtPeriodEnd: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      paymentRef,
      {
        uid,
        planId,
        billingCycle,
        amount: Number(planPrice.total.toFixed(2)),
        currency: planPrice.currency || DEFAULT_CURRENCY,
        provider: 'paypal',
        status: 'completed',
        paypalOrderId,
        paypalCaptureId: paypalCaptureId || '',
        currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(end),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { uid, planId, billingCycle, currentPeriodEnd: end.toISOString() };
}


async function createPayPalOrderHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const user = await requireUser(req);
    const { planId: rawPlanId, billingCycle = 'monthly', successUrl, cancelUrl } = req.body || {};
    const planId = resolveCheckoutPlanId(rawPlanId);
    if (!planId || !PLAN_PRICING[planId]) {
      console.error('createPayPalOrder:invalid_plan', { rawPlanId });
      return res.status(400).json({ error: 'invalid_plan', message: 'Plan must be club/basic or pro/premium' });
    }
    if (!BILLING_MONTHS[billingCycle]) return res.status(400).json({ error: 'invalid_billing_cycle' });

    const quote = calculatePlanPrice(planId, billingCycle);
    const paymentRef = db.collection('payments').doc();

    const returnUrl = `${successUrl || `${APP_URL}/payment-success`}?provider=paypal&paymentId=${paymentRef.id}`;
    const cancelReturnUrl = `${cancelUrl || `${APP_URL}/payment-cancel`}?provider=paypal&paymentId=${paymentRef.id}`;

    await paymentRef.set({
      uid: user.uid,
      email: user.email || '',
      planId,
      billingCycle,
      amount: Number(quote.total.toFixed(2)),
      currency: quote.currency || DEFAULT_CURRENCY,
      provider: 'paypal',
      status: 'created',
      environment: PAYPAL_ENV,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const order = await paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: paymentRef.id,
            custom_id: paymentRef.id,
            description: `Moisés Trading Club · ${PLAN_PRICING[planId].name} · ${billingCycle}`,
            amount: {
              currency_code: quote.currency || DEFAULT_CURRENCY,
              value: normalizeMoney(quote.total),
            },
          },
        ],
        application_context: {
          brand_name: 'Moisés Trading Club',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: returnUrl,
          cancel_url: cancelReturnUrl,
        },
      }),
    });

    const approvalUrl = order.links?.find((l) => l.rel === 'approve')?.href;

    await paymentRef.set(
      {
        paypalOrderId: order.id,
        paypalStatus: order.status || '',
        approvalUrl: approvalUrl || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      provider: 'paypal',
      paymentId: paymentRef.id,
      paypalOrderId: order.id,
      approvalUrl,
      checkoutUrl: approvalUrl,
      environment: PAYPAL_ENV,
    });
  } catch (e) {
    console.error('createPayPalOrder_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'create_paypal_order_failed' });
  }

}

async function capturePayPalOrderHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const user = await requireUser(req);
    const { paymentId, orderId, token } = req.body || {};
    const paypalOrderId = orderId || token;

    let paymentSnap = null;
    let paymentRef = null;

    if (paymentId) {
      paymentRef = db.collection('payments').doc(paymentId);
      paymentSnap = await paymentRef.get();
    } else if (paypalOrderId) {
      const q = await db.collection('payments').where('paypalOrderId', '==', paypalOrderId).limit(1).get();
      if (!q.empty) {
        paymentSnap = q.docs[0];
        paymentRef = paymentSnap.ref;
      }
    }

    if (!paymentSnap || !paymentSnap.exists) return res.status(404).json({ error: 'payment_not_found' });

    const payment = paymentSnap.data();
    if (payment.uid !== user.uid) return res.status(403).json({ error: 'payment_owner_mismatch' });

    if (payment.status === 'completed') {
      return res.status(200).json({
        ok: true,
        status: 'completed',
        paypalOrderId: payment.paypalOrderId || paypalOrderId,
        paymentId: paymentRef.id,
        alreadyCompleted: true,
      });
    }

    const orderToCapture = paypalOrderId || payment.paypalOrderId;
    if (!orderToCapture) return res.status(400).json({ error: 'missing_paypal_order_id' });

    const capture = await paypalRequest(`/v2/checkout/orders/${orderToCapture}/capture`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const captureId =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      capture.payment_source?.paypal?.account_id ||
      '';

    await paymentRef.set(
      {
        paypalCaptureResponse: capture,
        paypalStatus: capture.status || '',
        paypalCaptureId: captureId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (capture.status !== 'COMPLETED') {
      await paymentRef.set({ status: 'pending', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.status(200).json({
        ok: true,
        status: 'pending',
        paypalStatus: capture.status,
        paypalOrderId: orderToCapture,
        paymentId: paymentRef.id,
      });
    }

    const membership = await activateMembership({
      uid: payment.uid,
      planId: payment.planId,
      billingCycle: payment.billingCycle,
      paymentId: paymentRef.id,
      paypalOrderId: orderToCapture,
      paypalCaptureId: captureId,
    });

    return res.status(200).json({
      ok: true,
      status: 'completed',
      paypalStatus: capture.status,
      paypalOrderId: orderToCapture,
      paymentId: paymentRef.id,
      ...membership,
    });
  } catch (e) {
    console.error('capturePayPalOrder_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'capture_paypal_order_failed' });
  }

}

async function paypalWebhookHandler(req, res) {

  try {
    if (req.method !== 'POST') return res.status(405).send('method_not_allowed');

    const event = await verifyPayPalWebhook(req);
    const eventType = event.event_type;
    const resource = event.resource || {};

    await db.collection('paypalWebhookEvents').doc(event.id || `${Date.now()}`).set(
      {
        eventType,
        resource,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: PAYPAL_ENV,
      },
      { merge: true }
    );

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.invoice_id || '';
      if (orderId) {
        const q = await db.collection('payments').where('paypalOrderId', '==', orderId).limit(1).get();
        if (!q.empty) {
          const paymentRef = q.docs[0].ref;
          const payment = q.docs[0].data();
          if (payment.status !== 'completed') {
            await activateMembership({
              uid: payment.uid,
              planId: payment.planId,
              billingCycle: payment.billingCycle,
              paymentId: paymentRef.id,
              paypalOrderId: orderId,
              paypalCaptureId: resource.id || '',
            });
          }
        }
      }
    }

    if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      const orderId = resource?.supplementary_data?.related_ids?.order_id || '';
      if (orderId) {
        const q = await db.collection('payments').where('paypalOrderId', '==', orderId).limit(1).get();
        if (!q.empty) {
          await q.docs[0].ref.set(
            {
              status: eventType === 'PAYMENT.CAPTURE.REFUNDED' ? 'refunded' : 'denied',
              paypalWebhookEvent: eventType,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    }

    return res.status(200).send('ok');
  } catch (e) {
    console.error('paypalWebhook_failed', e);
    return res.status(400).send(e.message || 'webhook_failed');
  }

}

async function updateMembershipStatusHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);

  try {
    const user = await requireUser(req);
    const snap = await db.collection('users').doc(user.uid).get();
    const profile = snap.exists ? snap.data() : {};
    const end = profile.currentPeriodEnd?.toDate?.();

    if (profile.accessSource === 'payment' && end && end.getTime() <= Date.now()) {
      await snap.ref.set(
        {
          accessStatus: 'expired',
          subscriptionStatus: 'expired',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return res.status(200).json({ ok: true, status: 'expired' });
    }

    return res.status(200).json({ ok: true, status: profile.accessStatus || profile.subscriptionStatus || 'pending' });
  } catch (e) {
    console.error('updateMembershipStatus_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'update_membership_failed' });
  }

}

async function mtConnectHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
    await requireFeatureForUser(user.uid, 'mt5Sync');
    const body = req.body || {};
    const platform = String(body.platform || '').toLowerCase();
    if (!['mt4', 'mt5'].includes(platform)) return res.status(400).json({ error: 'invalid_platform' });
    const brokerName = assertRequiredString(body.brokerName, 'brokerName');
    const serverName = assertRequiredString(body.serverName, 'serverName');
    const login = assertRequiredString(body.login, 'login');
    const investorPassword = assertRequiredString(body.investorPassword, 'investorPassword');
    const accountName = String(body.accountName || `${brokerName} ${maskLogin(login)}`).trim();
    const syncFromDate = String(body.syncFromDate || new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
    const autoSync = body.autoSync !== false;

    const meta = await createMetaApiAccount({ platform, brokerName, serverName, login, investorPassword, accountName });
    const connectionId = `${user.uid}_metaapi_${meta.accountId}`;

    await db.collection('brokerConnections').doc(connectionId).set({
      userId: user.uid,
      provider: 'metaapi',
      brokerSource: 'metatrader',
      platform,
      brokerName,
      serverName,
      loginMasked: maskLogin(login),
      accountName,
      metaApiAccountId: meta.accountId,
      encryptedLogin: encryptSecret(login),
      encryptedInvestorPassword: encryptSecret(investorPassword),
      connectionStatus: meta.status || 'pending',
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      autoSync,
      syncFromDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({ success: true, connectionId, status: meta.status || 'pending' });
  } catch (e) {
    console.error('mtConnect_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'mt_connect_failed' });
  }

}

async function mtConnectionStatusHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
    await requireFeatureForUser(user.uid, 'mt5Sync');
    const connectionId = assertRequiredString(req.body?.connectionId, 'connectionId');
    const ref = db.collection('brokerConnections').doc(connectionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'connection_not_found' });
    const connection = snap.data();
    if (connection.userId !== user.uid) return res.status(403).json({ error: 'connection_owner_mismatch' });
    const status = await getMetaApiConnectionStatus(connection.metaApiAccountId);
    await ref.set({ connectionStatus: status.status, lastStatusMessage: status.message, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json(status);
  } catch (e) {
    console.error('mtConnectionStatus_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'mt_connection_status_failed' });
  }

}

async function mtSyncHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
    await requireFeatureForUser(user.uid, 'mt5Sync');
    const connectionId = assertRequiredString(req.body?.connectionId, 'connectionId');
    const snap = await db.collection('brokerConnections').doc(connectionId).get();
    if (!snap.exists) return res.status(404).json({ error: 'connection_not_found' });
    if (snap.data().userId !== user.uid) return res.status(403).json({ error: 'connection_owner_mismatch' });
    await snap.ref.set({ lastSyncStatus: 'pending', lastSyncError: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    const result = await syncConnectionDoc(snap, { fromDate: req.body?.fromDate, toDate: req.body?.toDate });
    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error('mtSync_failed', e);
    try {
      const connectionId = req.body?.connectionId;
      if (connectionId) await db.collection('brokerConnections').doc(connectionId).set({ lastSyncStatus: 'error', lastSyncError: e.message || 'mt_sync_failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}
    return res.status(e.status || 500).json({ error: e.message || 'mt_sync_failed' });
  }

}

async function mtDisconnectHandler(req, res) {

  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
    const connectionId = assertRequiredString(req.body?.connectionId, 'connectionId');
    const ref = db.collection('brokerConnections').doc(connectionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'connection_not_found' });
    const connection = snap.data();
    if (connection.userId !== user.uid) return res.status(403).json({ error: 'connection_owner_mismatch' });
    try {
      const api = await getMetaApi();
      const account = await api.metatraderAccountApi.getAccount(connection.metaApiAccountId);
      if (account.undeploy) await account.undeploy();
      if (account.remove) await account.remove();
    } catch (e) {
      console.warn('metaapi_disconnect_warning', e?.message || e);
    }
    await ref.set({ connectionStatus: 'disconnected', autoSync: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('mtDisconnect_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'mt_disconnect_failed' });
  }

}


async function createInviteHandler(req, res) {
  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
    await requireAdminUser(user.uid);
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid_email' });
    const plan = normalizeCommercialPlan(body.plan || 'influencer_trial');
    const days = Math.max(1, Math.min(365, Number(body.days || 30)));
    const token = randomBytes(18).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const features = { ...defaultPlanFeatures(plan), ...(body.features || {}) };
    const limits = { ...defaultPlanLimits(plan), ...(body.limits || {}) };
    await db.collection('invites').doc(token).set({
      token,
      email,
      plan,
      days,
      features,
      limits,
      status: 'active',
      used: false,
      createdBy: user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      source: 'invite',
    }, { merge: true });
    return res.status(200).json({ ok: true, token, link: `${APP_URL}/invite/${token}`, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error('createInvite_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'create_invite_failed' });
  }
}

async function acceptInviteHandler(req, res) {
  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
    const token = assertRequiredString(req.body?.token, 'token');
    const ref = db.collection('invites').doc(token);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'invite_not_found' });
    const invite = snap.data() || {};
    if (invite.used === true || invite.status === 'used') return res.status(409).json({ error: 'invite_already_used' });
    if (invite.status && invite.status !== 'active') return res.status(403).json({ error: 'invite_inactive' });
    const expiresMs = timestampToMillis(invite.expiresAt);
    if (expiresMs && expiresMs <= Date.now()) return res.status(403).json({ error: 'invite_expired' });
    const authEmail = String(user.email || '').trim().toLowerCase();
    const inviteEmail = String(invite.email || '').trim().toLowerCase();
    if (inviteEmail && authEmail && inviteEmail !== authEmail) return res.status(403).json({ error: 'invite_email_mismatch' });
    const plan = normalizeCommercialPlan(invite.plan || 'influencer_trial');
    const patch = makeCommercialAccessPatch(plan, { source: 'invite', features: invite.features || null, limits: invite.limits || null, days: invite.days || 30 });
    patch.email = user.email || invite.email || '';
    patch.role = patch.role || 'alumno';
    patch.inviteId = token;
    await db.runTransaction(async (tx) => {
      tx.set(db.collection('users').doc(user.uid), patch, { merge: true });
      tx.set(ref, { used: true, status: 'used', usedBy: user.uid, usedEmail: user.email || '', usedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    return res.status(200).json({ ok: true, plan, features: patch.features, currentPeriodEnd: patch.currentPeriodEnd?.toDate?.()?.toISOString?.() || null });
  } catch (e) {
    console.error('acceptInvite_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'accept_invite_failed' });
  }
}

async function expireMembershipsScheduledJob() {

    const now = admin.firestore.Timestamp.now();
    const q = await db
      .collection('users')
      .where('accessSource', '==', 'payment')
      .where('currentPeriodEnd', '<=', now)
      .where('subscriptionStatus', '==', 'active')
      .limit(500)
      .get();

    const batch = db.batch();
    q.docs.forEach((docSnap) => {
      batch.set(
        docSnap.ref,
        {
          accessStatus: 'expired',
          subscriptionStatus: 'expired',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    if (!q.empty) await batch.commit();
    console.log(`expired_memberships_updated=${q.size}`);
  
}

async function mtAutoSyncJob() {

    const q = await db.collection('brokerConnections')
      .where('provider', '==', 'metaapi')
      .where('autoSync', '==', true)
      .where('connectionStatus', '==', 'connected')
      .limit(100)
      .get();
    let ok = 0;
    let failed = 0;
    for (const docSnap of q.docs) {
      try {
        const connection = docSnap.data() || {};
        const ownerProfile = connection.userId ? await getUserProfile(connection.userId) : null;
        if (!canUseFeature(ownerProfile, 'mt5Sync')) {
          await docSnap.ref.set({ autoSync: false, lastSyncStatus: 'blocked_by_plan', lastSyncError: 'mt5Sync_not_included_in_plan', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          continue;
        }
        await syncConnectionDoc(docSnap);
        ok++;
      } catch (e) {
        failed++;
        console.error('mtAutoSync_connection_failed', docSnap.id, e?.message || e);
        await docSnap.ref.set({ lastSyncStatus: 'error', lastSyncError: e.message || 'mt_auto_sync_failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    console.log(`mt_auto_sync_done ok=${ok} failed=${failed}`);
  
}


const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  next();
});

app.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'mtc-render-backend', version: '44.1' }));
app.get('/api/health', (_req, res) => res.status(200).json({ ok: true, service: 'mtc-render-backend', version: '44.1' }));


app.get('/api/plans', (req, res) => {
  setCors(req, res);
  return res.status(200).json({
    ok: true,
    currency: DEFAULT_CURRENCY,
    plans: Object.entries(PLAN_PRICING).map(([id, plan]) => ({ id, name: plan.name, monthly: plan.monthly, currency: plan.currency }))
  });
});
app.post('/api/createPayPalOrder', createPayPalOrderHandler);
app.post('/api/capturePayPalOrder', capturePayPalOrderHandler);
app.post('/api/paypalWebhook', paypalWebhookHandler);
app.post('/api/paypal/webhook', paypalWebhookHandler);
app.post('/api/updateMembershipStatus', updateMembershipStatusHandler);
app.post('/api/invites/create', createInviteHandler);
app.post('/api/invites/accept', acceptInviteHandler);

app.post('/api/mtConnect', mtConnectHandler);
app.post('/api/mtConnectionStatus', mtConnectionStatusHandler);
app.post('/api/mtSync', mtSyncHandler);
app.post('/api/mtDisconnect', mtDisconnectHandler);

function requireCron(req, res) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return true; // allowed when no secret is configured, useful for local dev
  const received = req.get('x-cron-secret') || req.query.secret || req.body?.secret || '';
  if (received !== secret) {
    res.status(401).json({ error: 'invalid_cron_secret' });
    return false;
  }
  return true;
}

app.post('/api/cron/expireMemberships', async (req, res) => {
  try {
    if (!requireCron(req, res)) return;
    await expireMembershipsScheduledJob();
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('cron_expire_memberships_failed', e);
    res.status(500).json({ error: e.message || 'cron_expire_memberships_failed' });
  }
});

app.post('/api/cron/mtAutoSync', async (req, res) => {
  try {
    if (!requireCron(req, res)) return;
    await mtAutoSyncJob();
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('cron_mt_auto_sync_failed', e);
    res.status(500).json({ error: e.message || 'cron_mt_auto_sync_failed' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('unhandled_server_error', err);
  res.status(err.status || 500).json({ error: err.message || 'server_error' });
});

app.listen(PORT, () => {
  console.log(`MTC Render backend listening on port ${PORT}`);
});
