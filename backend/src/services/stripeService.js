/**
 * Stripe Payment Service
 *
 * Handles subscription billing via Stripe Checkout Sessions.
 * Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in your .env.
 *
 * Price IDs must be created in the Stripe Dashboard and mapped here.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
}

// Map internal plan names → Stripe Price IDs (create these in Stripe Dashboard)
const PLAN_PRICE_MAP = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_placeholder',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder',
};

/**
 * Returns true if Stripe is configured and ready to accept payments.
 */
function isConfigured() {
  return !!stripe && !!STRIPE_SECRET_KEY;
}

/**
 * Create a Stripe Checkout Session for plan upgrade/change.
 * @param {object} opts
 * @param {string} opts.plan - Plan key: 'basic' | 'premium' | 'enterprise'
 * @param {number} opts.userId - Internal user ID
 * @param {string} opts.email - Customer email for Stripe session
 * @param {string} opts.successUrl - Redirect URL on success
 * @param {string} opts.cancelUrl - Redirect URL on cancel
 * @returns {Promise<{sessionId: string, url: string}>}
 */
async function createCheckoutSession({ plan, userId, email, successUrl, cancelUrl }) {
  if (!stripe) {
    throw Object.assign(new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.'), { statusCode: 503 });
  }

  const priceId = PLAN_PRICE_MAP[plan];
  if (!priceId || priceId.includes('placeholder')) {
    throw Object.assign(new Error(`No Stripe price configured for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()} in .env.`), { statusCode: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(userId), plan },
    subscription_data: {
      metadata: { userId: String(userId), plan },
    },
  });

  return { sessionId: session.id, url: session.url };
}

/**
 * Create a Stripe Customer Portal session for self-serve billing management.
 * @param {string} stripeCustomerId
 * @param {string} returnUrl
 * @returns {Promise<{url: string}>}
 */
async function createPortalSession(stripeCustomerId, returnUrl) {
  if (!stripe) {
    throw Object.assign(new Error('Stripe is not configured.'), { statusCode: 503 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Construct and verify a Stripe webhook event.
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - Stripe-Signature header
 * @returns {object} Stripe event object
 */
function constructWebhookEvent(rawBody, signature) {
  if (!stripe) {
    throw Object.assign(new Error('Stripe is not configured.'), { statusCode: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw Object.assign(new Error('STRIPE_WEBHOOK_SECRET not set.'), { statusCode: 500 });
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

module.exports = {
  isConfigured,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  PLAN_PRICE_MAP,
};
