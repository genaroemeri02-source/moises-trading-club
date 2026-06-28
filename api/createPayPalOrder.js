const DEFAULT_CURRENCY = 'USD';

const PLAN_CONFIG = {
  club: {
    aliases: ['club', 'basic'],
    label: 'Club',
    monthly: 14.99,
  },
  pro: {
    aliases: ['pro', 'premium'],
    label: 'Pro',
    monthly: 24.99,
  },
};

const PAYPAL_PLAN_ENV_KEYS = {
  club: {
    monthly: 'PAYPAL_PLAN_ID_CLUB_MONTHLY',
    quarterly: 'PAYPAL_PLAN_ID_CLUB_QUARTERLY',
    annual: 'PAYPAL_PLAN_ID_CLUB_ANNUAL',
  },
  pro: {
    monthly: 'PAYPAL_PLAN_ID_PRO_MONTHLY',
    quarterly: 'PAYPAL_PLAN_ID_PRO_QUARTERLY',
    annual: 'PAYPAL_PLAN_ID_PRO_ANNUAL',
  },
};

const REQUIRED_ENV_VARS = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_MODE',
  'APP_URL',
];

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function missingEnv(name) {
  return !String(process.env[name] || '').trim();
}

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const err = new Error(`Missing env var: ${name}`);
    err.status = 500;
    throw err;
  }
  return value;
}

function paypalBaseUrl(mode) {
  return String(mode).toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function normalizeBillingCycle(value) {
  const cycle = String(value || 'monthly').toLowerCase();
  if (cycle === 'yearly') return 'annual';
  return cycle;
}

function normalizePlan(value) {
  const raw = String(value || '').trim().toLowerCase();
  return Object.entries(PLAN_CONFIG).find(([, config]) => config.aliases.includes(raw));
}

function paypalPlanEnvKey(planKey, billingCycle) {
  return PAYPAL_PLAN_ENV_KEYS[planKey]?.[billingCycle] || '';
}

function cycleQuote(plan, billingCycle) {
  if (!plan.monthly) return null;
  if (billingCycle === 'monthly') {
    return { total: plan.monthly, months: 1 };
  }
  if (billingCycle === 'quarterly') {
    return { total: plan.monthly * 3 * 0.8, months: 3 };
  }
  if (billingCycle === 'annual') {
    return { total: plan.monthly * 3 * 0.8 * 4 * 0.9, months: 12 };
  }
  return null;
}

function safePaypalBody(payload) {
  if (!payload || typeof payload !== 'object') return payload || {};
  return {
    name: payload.name,
    message: payload.message,
    debug_id: payload.debug_id,
    details: Array.isArray(payload.details)
      ? payload.details.map((detail) => ({
          issue: detail.issue,
          description: detail.description,
          field: detail.field,
        }))
      : undefined,
    error: payload.error,
    error_description: payload.error_description,
  };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function paypalAccessToken({ baseUrl, clientId, clientSecret }) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await response.json().catch(() => ({}));
  console.log('createPayPalOrder paypal oauth status:', response.status);

  if (!response.ok) {
    const err = new Error('PayPal access token request failed');
    err.status = response.status;
    err.paypalBody = safePaypalBody(payload);
    throw err;
  }

  return payload.access_token;
}

async function paypalRequest({ baseUrl, token, path, body }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  console.log('createPayPalOrder paypal status:', response.status);

  if (!response.ok) {
    const err = new Error('PayPal checkout request failed');
    err.status = response.status;
    err.paypalBody = safePaypalBody(payload);
    throw err;
  }

  return payload;
}

function buildSubscriptionPayload({ planId, email, userId, returnUrl, cancelUrl }) {
  return {
    plan_id: planId,
    custom_id: userId || undefined,
    subscriber: email ? { email_address: email } : undefined,
    application_context: {
      brand_name: 'Moises Trading Club',
      locale: 'es-AR',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };
}

function buildOrderPayload({ planKey, plan, billingCycle, quote, userId, returnUrl, cancelUrl }) {
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: userId || `${planKey}-${Date.now()}`,
        custom_id: userId || undefined,
        description: `Moises Trading Club - ${plan.label} - ${billingCycle}`,
        amount: {
          currency_code: DEFAULT_CURRENCY,
          value: Number(quote.total).toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: 'Moises Trading Club',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: 'Only POST is allowed' });
  }

  try {
    const missing = REQUIRED_ENV_VARS.find(missingEnv);
    if (missing) return json(res, 500, { error: `Missing env var: ${missing}` });

    const body = await readBody(req);
    const billingCycle = normalizeBillingCycle(body.billingCycle);
    const userId = body.userId || body.uid || '';
    const email = body.email || '';
    const planInput = body.plan || body.planId || '';
    const planEntry = normalizePlan(planInput);

    if (!planEntry) {
      return json(res, 400, {
        error: 'invalid_plan',
        message: 'Plan must be one of: club/basic, pro/premium',
      });
    }

    const [planKey, plan] = planEntry;
    const envKey = paypalPlanEnvKey(planKey, billingCycle);
    if (!envKey) {
      return json(res, 400, {
        error: 'invalid_billing_cycle',
        message: 'Billing cycle must be monthly, quarterly, or annual',
      });
    }
    console.log("checkout payload", { planId: body.planId, plan: body.plan, billingCycle });
    console.log("paypal env key", envKey);
    const planId = requireEnv(envKey);
    const mode = requireEnv('PAYPAL_MODE');
    const appUrl = requireEnv('APP_URL').replace(/\/$/, '');
    const baseUrl = paypalBaseUrl(mode);
    const returnUrl = String(body.successUrl || `${appUrl}/payment-success`);
    const cancelUrl = String(body.cancelUrl || `${appUrl}/payment-cancel`);

    console.log('createPayPalOrder PAYPAL_MODE:', mode);
    console.log('createPayPalOrder planId found:', Boolean(planId));

    const quote = cycleQuote(plan, billingCycle);
    if (billingCycle !== 'monthly' && !quote) {
      return json(res, 400, {
        error: 'invalid_billing_cycle',
        message: 'Billing cycle must be monthly, quarterly, or annual',
      });
    }

    const token = await paypalAccessToken({
      baseUrl,
      clientId: requireEnv('PAYPAL_CLIENT_ID'),
      clientSecret: requireEnv('PAYPAL_CLIENT_SECRET'),
    });

    const paypalPayload = await paypalRequest({
      baseUrl,
      token,
      path: '/v1/billing/subscriptions',
      body: buildSubscriptionPayload({ planId, email, userId, returnUrl, cancelUrl }),
    });

    const approvalUrl = paypalPayload.links?.find((link) => link.rel === 'approve')?.href;
    if (!approvalUrl) {
      return json(res, 502, {
        error: 'paypal_approval_url_missing',
        message: 'PayPal did not return an approval URL',
        paypalStatus: paypalPayload.status || null,
      });
    }

    return json(res, 200, {
      ok: true,
      provider: 'paypal',
      mode,
      plan: planKey,
      billingCycle,
      paypalId: paypalPayload.id,
      paypalStatus: paypalPayload.status || null,
      approvalUrl,
    });
  } catch (error) {
    console.error('createPayPalOrder error:', {
      message: error.message,
      status: error.status || 500,
      paypalBody: error.paypalBody,
    });

    return json(res, error.status || 500, {
      error: error.message || 'create_paypal_order_failed',
      message: 'Could not create PayPal checkout',
      paypalStatus: error.status || null,
      paypalResponse: error.paypalBody || null,
    });
  }
}
