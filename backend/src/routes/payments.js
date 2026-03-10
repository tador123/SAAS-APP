/**
 * Payment routes — Stripe Checkout + Webhooks for subscription billing.
 *
 * POST /api/payments/checkout      — Create Stripe Checkout Session
 * POST /api/payments/webhook       — Stripe webhook receiver
 * GET  /api/payments/portal        — Stripe Customer Portal
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const stripeService = require('../services/stripeService');
const { User, Property, AuditLog, sequelize } = require('../models');
const logger = require('../services/logger');

// POST /api/payments/checkout — Create a Stripe Checkout Session for plan upgrade
router.post('/checkout', authenticate, authorize('admin'), [
  body('plan').isIn(['basic', 'premium', 'enterprise']).withMessage('Plan must be basic, premium, or enterprise'),
], async (req, res, next) => {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        error: 'Payment processing is not configured',
        message: 'Contact support to enable billing, or set STRIPE_SECRET_KEY in the server environment.',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { plan } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const { sessionId, url } = await stripeService.createCheckoutSession({
      plan,
      userId: req.user.id,
      email: req.user.email,
      successUrl: `${frontendUrl}/settings?payment=success&plan=${plan}`,
      cancelUrl: `${frontendUrl}/settings?payment=cancelled`,
    });

    logger.info('Stripe checkout session created', { userId: req.user.id, plan, sessionId });

    res.json({ sessionId, url });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/webhook — Stripe webhook (raw body required)
router.post('/webhook', async (req, res) => {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const event = stripeService.constructWebhookEvent(req.body, sig);

    logger.info('Stripe webhook received', { type: event.type, id: event.id });

    // ── Idempotency: skip already-processed events ──
    const [existing] = await sequelize.query(
      'SELECT id FROM stripe_events WHERE id = :eventId',
      { replacements: { eventId: event.id }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => [null]); // table may not exist yet during first migration cycle

    if (existing) {
      logger.info('Stripe webhook duplicate — skipping', { id: event.id });
      return res.json({ received: true, duplicate: true });
    }

    // Record this event as processed
    await sequelize.query(
      'INSERT INTO stripe_events (id, type, processed_at) VALUES (:id, :type, NOW()) ON CONFLICT (id) DO NOTHING',
      { replacements: { id: event.id, type: event.type } }
    ).catch(() => {}); // graceful if table missing

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.userId, 10);
        const plan = session.metadata?.plan;

        if (userId && plan) {
          const user = await User.findByPk(userId);
          if (user && user.propertyId) {
            const property = await Property.findByPk(user.propertyId);
            if (property) {
              const oldPlan = property.subscriptionPlan;
              await property.update({
                subscriptionPlan: plan,
                stripeCustomerId: session.customer,
              });
              await AuditLog.log({
                userId,
                action: 'update',
                entityType: 'Property',
                entityId: property.id,
                changes: { subscriptionPlan: { from: oldPlan, to: plan }, via: 'stripe_checkout' },
              });
              logger.info('Plan upgraded via Stripe', { userId, propertyId: property.id, from: oldPlan, to: plan });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled — revert to free
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata?.userId, 10);
        if (userId) {
          const user = await User.findByPk(userId);
          if (user && user.propertyId) {
            const property = await Property.findByPk(user.propertyId);
            if (property) {
              const oldPlan = property.subscriptionPlan;
              await property.update({ subscriptionPlan: 'free' });
              await AuditLog.log({
                userId,
                action: 'update',
                entityType: 'Property',
                entityId: property.id,
                changes: { subscriptionPlan: { from: oldPlan, to: 'free' }, via: 'stripe_subscription_deleted' },
              });
              logger.info('Plan reverted to free (subscription cancelled)', { userId, propertyId: property.id });
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        logger.warn('Stripe payment failed', {
          customerId: invoice.customer,
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
        });
        break;
      }

      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error: error.message });
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

// GET /api/payments/portal — Redirect to Stripe Customer Portal for self-serve billing
router.get('/portal', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Payment processing not configured' });
    }

    const user = await User.findByPk(req.user.id);
    const property = user.propertyId ? await Property.findByPk(user.propertyId) : null;
    const stripeCustomerId = property?.stripeCustomerId || user.stripeCustomerId;
    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe to a plan first.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { url } = await stripeService.createPortalSession(stripeCustomerId, `${frontendUrl}/settings`);

    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/status — Check if Stripe is configured
router.get('/status', authenticate, (req, res) => {
  res.json({
    configured: stripeService.isConfigured(),
    message: stripeService.isConfigured()
      ? 'Payment processing is active'
      : 'Payment processing is not configured. Plans can be changed manually by admin.',
  });
});

module.exports = router;
