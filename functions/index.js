import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

admin.initializeApp();

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
  const mod = await import('metaapi.cloud-sdk');
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

// Canonical order/pricing keys (aligned with commercialConfig). Brand aliases via resolveCheckoutPlanId.
const PLAN_PRICING = {
  basic: { name: 'Club', monthly: 14.99, currency: 'USD' },
  premium: { name: 'Pro', monthly: 24.99, currency: 'USD' },
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

function allowedOrigin(origin = '') {
  if (!origin) return true;
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
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

async function paypalRequest(path, options = {}) {
  const token = await paypalAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('paypal_api_error', path, response.status, payload);
    const err = new Error(payload?.message || payload?.name || 'paypal_api_error');
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
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

export const createPayPalOrder = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
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
});

export const capturePayPalOrder = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
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
});

async function verifyPayPalWebhook(req) {
  if (!PAYPAL_WEBHOOK_ID) throw new Error('paypal_webhook_id_missing');

  const token = await paypalAccessToken();
  const body = req.rawBody ? JSON.parse(req.rawBody.toString('utf8')) : req.body;

  const verificationPayload = {
    auth_algo: req.get('paypal-auth-algo'),
    cert_url: req.get('paypal-cert-url'),
    transmission_id: req.get('paypal-transmission-id'),
    transmission_sig: req.get('paypal-transmission-sig'),
    transmission_time: req.get('paypal-transmission-time'),
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: body,
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verificationPayload),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.verification_status !== 'SUCCESS') {
    console.error('paypal_webhook_verification_failed', payload);
    throw new Error('webhook_verification_failed');
  }

  return body;
}

export const paypalWebhook = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
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
});

export const updateMembershipStatus = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
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
});

export const expireMembershipsScheduled = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'America/Argentina/Buenos_Aires', region: 'us-central1' },
  async () => {
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
);

export const mtConnect = onRequest({ region: 'us-central1', cors: false, timeoutSeconds: 300, memory: '512MiB' }, async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
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
});

export const mtConnectionStatus = onRequest({ region: 'us-central1', cors: false, timeoutSeconds: 120 }, async (req, res) => {
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
    const status = await getMetaApiConnectionStatus(connection.metaApiAccountId);
    await ref.set({ connectionStatus: status.status, lastStatusMessage: status.message, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json(status);
  } catch (e) {
    console.error('mtConnectionStatus_failed', e);
    return res.status(e.status || 500).json({ error: e.message || 'mt_connection_status_failed' });
  }
});

export const mtSync = onRequest({ region: 'us-central1', cors: false, timeoutSeconds: 540, memory: '1GiB' }, async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(req, res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req);
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
});

export const mtDisconnect = onRequest({ region: 'us-central1', cors: false, timeoutSeconds: 180 }, async (req, res) => {
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
});

export const mtAutoSync = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Etc/UTC', region: 'us-central1', timeoutSeconds: 540, memory: '1GiB' },
  async () => {
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
);
