/**
 * Moisés Trading Club v43.2 — PayPal Checkout sandbox backend starter.
 *
 * This file is a Cloud Functions / Node starter. Do not import it in React.
 * Keep PAYPAL_CLIENT_SECRET only on the server.
 *
 * Required env:
 * PAYPAL_CLIENT_ID
 * PAYPAL_CLIENT_SECRET
 * PAYPAL_ENV=sandbox | live
 * PAYPAL_WEBHOOK_ID
 * APP_URL=https://www.moisestradingclub.com
 */

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * HISTORICAL STARTER — NOT RUNTIME
 * Legacy sample prices 29/49. Canonical prices: 14.99 / 24.99 in commercialConfig + server/functions.
 * Do not copy these amounts into live checkout.
 */
const PLAN_PRICING = {
  basic: { monthly: 29, currency: 'USD', label: 'Esencial' }, // HISTORICAL — use 14.99
  premium: { monthly: 49, currency: 'USD', label: 'Pro' } // HISTORICAL — use 24.99
};
const BILLING_CYCLES = {
  monthly: { months: 1 },
  quarterly: { months: 3 },
  yearly: { months: 12 },
  annual: { months: 12 }
};

function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function assertAllowedPlan(planId) {
  if (!PLAN_PRICING[planId]) throw new Error('invalid_plan');
}
function normalizeCycle(billingCycle) {
  return billingCycle === 'annual' ? 'yearly' : billingCycle;
}
function assertAllowedCycle(billingCycle) {
  if (!BILLING_CYCLES[normalizeCycle(billingCycle)]) throw new Error('invalid_billing_cycle');
}
function calculatePlanPrice(planId, billingCycle = 'monthly') {
  assertAllowedPlan(planId);
  assertAllowedCycle(billingCycle);
  const cycle = normalizeCycle(billingCycle);
  const pricing = PLAN_PRICING[planId];
  const monthly = pricing.monthly;
  if (cycle === 'monthly') return { amount: monthly, currency: pricing.currency, months: 1 };
  if (cycle === 'quarterly') return { amount: monthly * 3 * 0.8, currency: pricing.currency, months: 3 };
  return { amount: monthly * 3 * 0.8 * 4 * 0.9, currency: pricing.currency, months: 12 };
}
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}
function json(res, status, body) {
  res.status(status).set('Content-Type', 'application/json').send(JSON.stringify(body));
}
function setCors(req, res) {
  res.set('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Paypal-Transmission-Id, Paypal-Transmission-Time, Paypal-Transmission-Sig, Paypal-Cert-Url, Paypal-Auth-Algo');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}
async function requireUser(req) {
  const authHeader = req.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) throw new Error('missing_auth_token');
  return admin.auth().verifyIdToken(token);
}
async function paypalAccessToken() {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error_description || 'paypal_oauth_failed');
  return payload.access_token;
}
async function paypalRequest(path, options = {}) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.name || 'paypal_request_failed';
    throw new Error(detail);
  }
  return payload;
}
async function userHasActiveAccess(uid) {
  const snap = await db.doc(`users/${uid}`).get();
  const u = snap.data() || {};
  if (u.role === 'admin' || u.role === 'moderador' || u.accessStatus === 'manual_approved') return true;
  const end = u.currentPeriodEnd?.toDate ? u.currentPeriodEnd.toDate() : null;
  return (u.accessStatus === 'active' || u.subscriptionStatus === 'active') && (!end || end > new Date());
}

exports.createPayPalOrder = onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    const user = await requireUser(req);
    const { planId, billingCycle } = req.body || {};
    assertAllowedPlan(planId);
    assertAllowedCycle(billingCycle);

    // Allow renewal even if active. Block privileged/manual users only if you want; here we allow a paid renewal.
    const quote = calculatePlanPrice(planId, billingCycle);
    const paymentRef = db.collection('payments').doc();
    const appUrl = process.env.APP_URL || 'https://www.moisestradingclub.com';
    const returnUrl = `${appUrl}/payment-success?provider=paypal&paymentId=${paymentRef.id}`;
    const cancelUrl = `${appUrl}/payment-cancel?provider=paypal&paymentId=${paymentRef.id}`;

    const order = await paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: paymentRef.id,
          custom_id: paymentRef.id,
          description: `Moisés Trading Club ${PLAN_PRICING[planId].label} · ${normalizeCycle(billingCycle)}`,
          amount: { currency_code: quote.currency, value: quote.amount.toFixed(2) }
        }],
        application_context: {
          brand_name: 'Moisés Trading Club',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      })
    });

    const approvalUrl = (order.links || []).find(l => l.rel === 'approve')?.href;
    await paymentRef.set({
      uid: user.uid,
      email: user.email || req.body.email || '',
      provider: 'paypal',
      planId,
      plan: planId,
      billingCycle: normalizeCycle(billingCycle),
      amount: quote.amount,
      currency: quote.currency,
      status: 'created',
      paypalOrderId: order.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return json(res, 200, { approvalUrl, orderId: order.id, paymentId: paymentRef.id });
  } catch (error) {
    console.error('createPayPalOrder', error);
    return json(res, 400, { error: error.message || 'create_paypal_order_failed' });
  }
});

async function activateMembership({ uid, paymentId, planId, billingCycle, provider, paypalOrderId, captureId }) {
  const now = new Date();
  const quote = calculatePlanPrice(planId, billingCycle);
  const currentPeriodEnd = addMonths(now, quote.months);
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const alreadyStarted = !!userSnap.data()?.startedAt;

  await userRef.set({
    accessStatus: 'active',
    subscriptionStatus: 'active',
    accessSource: 'payment',
    plan: planId,
    billingCycle: normalizeCycle(billingCycle),
    paymentProvider: provider,
    paypalOrderId,
    subscriptionId: null,
    ...(alreadyStarted ? {} : { startedAt: admin.firestore.Timestamp.fromDate(now) }),
    currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    cancelAtPeriodEnd: false,
    lastPaymentAt: admin.firestore.Timestamp.fromDate(now),
    expiredAt: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await db.doc(`payments/${paymentId}`).set({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    captureId: captureId || null
  }, { merge: true });

  return { currentPeriodEnd };
}

exports.capturePayPalOrder = onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    const user = await requireUser(req);
    const paymentId = req.body?.paymentId || req.body?.payment_id || '';
    let orderId = req.body?.orderId || req.body?.token || req.body?.paypalOrderId || '';
    let paymentDoc = null;
    let payment = null;

    if (paymentId) {
      paymentDoc = db.doc(`payments/${paymentId}`);
      const paymentSnap = await paymentDoc.get();
      if (!paymentSnap.exists) return json(res, 404, { error: 'payment_not_found' });
      payment = paymentSnap.data();
      if (payment.uid !== user.uid) return json(res, 403, { error: 'payment_owner_mismatch' });
      orderId = orderId || payment.paypalOrderId || '';
    }

    if (!paymentDoc && orderId) {
      const snap = await db.collection('payments').where('paypalOrderId', '==', orderId).limit(1).get();
      if (snap.empty) return json(res, 404, { error: 'payment_not_found' });
      const docSnap = snap.docs[0];
      paymentDoc = docSnap.ref;
      payment = docSnap.data();
      if (payment.uid !== user.uid) return json(res, 403, { error: 'payment_owner_mismatch' });
    }

    if (!orderId || !paymentDoc || !payment) {
      return json(res, 400, { error: 'missing_order_or_payment_id' });
    }

    if (payment.status === 'completed') {
      return json(res, 200, {
        status: 'completed',
        paypalOrderId: orderId,
        paymentId: paymentId || paymentDoc.id,
        alreadyCompleted: true
      });
    }

    const capture = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', body: '{}' });
    const captureStatus = capture?.status;
    const captureId = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
    if (captureStatus === 'COMPLETED') {
      const result = await activateMembership({ uid: payment.uid, paymentId: paymentDoc.id, planId: payment.planId, billingCycle: payment.billingCycle, provider: 'paypal', paypalOrderId: orderId, captureId });
      return json(res, 200, { status: 'completed', paypalOrderId: orderId, paymentId: paymentDoc.id, currentPeriodEnd: result.currentPeriodEnd.toISOString() });
    }
    const nextStatus = captureStatus === 'PENDING' ? 'pending' : 'failed';
    await paymentDoc.set({ status: nextStatus, paypalCaptureStatus: captureStatus || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return json(res, 200, { status: nextStatus, paypalOrderId: orderId, paymentId: paymentDoc.id });
  } catch (error) {
    console.error('capturePayPalOrder', error);
    return json(res, 400, { error: error.message || 'capture_paypal_order_failed' });
  }
});

async function verifyPayPalWebhook(req, eventBody) {
  const token = await paypalAccessToken();
  const payload = {
    auth_algo: req.get('Paypal-Auth-Algo'),
    cert_url: req.get('Paypal-Cert-Url'),
    transmission_id: req.get('Paypal-Transmission-Id'),
    transmission_sig: req.get('Paypal-Transmission-Sig'),
    transmission_time: req.get('Paypal-Transmission-Time'),
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: eventBody
  };
  const response = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  return response.ok && result.verification_status === 'SUCCESS';
}

exports.paypalWebhook = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    const event = req.body;
    const verified = await verifyPayPalWebhook(req, event);
    if (!verified) return json(res, 401, { error: 'invalid_paypal_webhook_signature' });

    const type = event.event_type;
    const resource = event.resource || {};
    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id || resource.id;
    const captureId = type?.startsWith('PAYMENT.CAPTURE') ? resource.id : null;

    let snap = await db.collection('payments').where('paypalOrderId', '==', paypalOrderId).limit(1).get();
    if (snap.empty && resource.custom_id) snap = await db.collection('payments').where(admin.firestore.FieldPath.documentId(), '==', resource.custom_id).limit(1).get();
    if (snap.empty) return json(res, 200, { ok: true, ignored: 'payment_not_found' });

    const paymentDoc = snap.docs[0];
    const payment = paymentDoc.data();
    await paymentDoc.ref.set({ lastWebhookType: type, lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(), rawEvent: event }, { merge: true });

    if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      await activateMembership({ uid: payment.uid, paymentId: paymentDoc.id, planId: payment.planId, billingCycle: payment.billingCycle, provider: 'paypal', paypalOrderId, captureId });
    } else if (type === 'PAYMENT.CAPTURE.DENIED') {
      await paymentDoc.ref.set({ status: 'denied', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } else if (type === 'PAYMENT.CAPTURE.PENDING' || type === 'CHECKOUT.ORDER.APPROVED') {
      await paymentDoc.ref.set({ status: 'pending', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('paypalWebhook', error);
    return json(res, 500, { error: error.message || 'paypal_webhook_failed' });
  }
});

exports.expireMembershipsScheduled = onSchedule('every 60 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection('users')
    .where('subscriptionStatus', '==', 'active')
    .where('currentPeriodEnd', '<=', now)
    .get();

  const batch = db.batch();
  snap.forEach(doc => {
    const data = doc.data();
    if (data.accessStatus === 'manual_approved' || data.role === 'admin' || data.role === 'moderador') return;
    batch.set(doc.ref, {
      subscriptionStatus: 'expired',
      accessStatus: 'inactive',
      expiredAt: now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
});

module.exports = { calculatePlanPrice, activateMembership };
