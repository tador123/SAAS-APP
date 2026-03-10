/**
 * Subscription plan middleware — enforces feature limits based on property's plan.
 *
 * Plan limits:
 *   free:       10 rooms,  5 tables, 1 staff,      no invoices
 *   basic:      50 rooms, 20 tables, 5 staff,      invoices enabled
 *   premium:    unlimited rooms/tables/staff,       invoices, analytics, API access
 *   enterprise: unlimited + multi-property
 */

const { Room, RestaurantTable, User, Property } = require('../models');

const PLAN_LIMITS = {
  free: {
    maxRooms: 10,
    maxTables: 5,
    maxStaff: 1,
    invoices: false,
    analytics: false,
    apiAccess: false,
    customBranding: false,
    multiProperty: false,
  },
  basic: {
    maxRooms: 50,
    maxTables: 20,
    maxStaff: 5,
    invoices: true,
    analytics: false,
    apiAccess: false,
    customBranding: false,
    multiProperty: false,
  },
  premium: {
    maxRooms: Infinity,
    maxTables: Infinity,
    maxStaff: Infinity,
    invoices: true,
    analytics: true,
    apiAccess: true,
    customBranding: true,
    multiProperty: false,
  },
  enterprise: {
    maxRooms: Infinity,
    maxTables: Infinity,
    maxStaff: Infinity,
    invoices: true,
    analytics: true,
    apiAccess: true,
    customBranding: true,
    multiProperty: true,
  },
};

/**
 * Returns the plan limits for a given plan name.
 */
function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Helper: resolve the property's subscription plan.
 * Uses req.propertyId (set by tenantScope) or falls back to user's propertyId.
 */
async function getPropertyPlan(req) {
  const propertyId = req.propertyId || req.user?.propertyId;
  if (propertyId) {
    const property = await Property.findByPk(propertyId, { attributes: ['subscriptionPlan'] });
    if (property) return property.subscriptionPlan || 'free';
  }
  // Fallback for users without property assignment
  return req.user?.subscriptionPlan || 'free';
}

/**
 * Middleware: require one of the listed plans (or higher).
 * Usage: requirePlan('basic', 'premium', 'enterprise')
 */
const requirePlan = (...allowedPlans) => {
  return async (req, res, next) => {
    try {
      const plan = await getPropertyPlan(req);
      if (!allowedPlans.includes(plan)) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          requiredPlans: allowedPlans,
          currentPlan: plan,
          message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}. Your current plan is "${plan}".`,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: require a specific feature to be enabled in the property's plan.
 * Usage: requireFeature('invoices')
 */
const requireFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const plan = await getPropertyPlan(req);
      const limits = getPlanLimits(plan);
      if (!limits[feature]) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          feature,
          currentPlan: plan,
          message: `The "${feature}" feature is not available on the "${plan}" plan. Please upgrade your subscription.`,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: check that adding a new room doesn't exceed the plan limit.
 * Attach to POST /api/rooms.
 */
const checkRoomLimit = async (req, res, next) => {
  try {
    const plan = await getPropertyPlan(req);
    const limits = getPlanLimits(plan);
    if (limits.maxRooms === Infinity) return next();

    const propertyId = req.propertyId || req.user?.propertyId;
    const countWhere = propertyId ? { propertyId } : {};
    const currentCount = await Room.count({ where: countWhere });
    if (currentCount >= limits.maxRooms) {
      return res.status(403).json({
        error: 'Room limit reached',
        currentPlan: plan,
        limit: limits.maxRooms,
        current: currentCount,
        message: `Your "${plan}" plan allows up to ${limits.maxRooms} rooms. You currently have ${currentCount}. Please upgrade to add more rooms.`,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: check that adding a new table doesn't exceed the plan limit.
 * Attach to POST /api/restaurant/tables.
 */
const checkTableLimit = async (req, res, next) => {
  try {
    const plan = await getPropertyPlan(req);
    const limits = getPlanLimits(plan);
    if (limits.maxTables === Infinity) return next();

    const propertyId = req.propertyId || req.user?.propertyId;
    const countWhere = propertyId ? { propertyId } : {};
    const currentCount = await RestaurantTable.count({ where: countWhere });
    if (currentCount >= limits.maxTables) {
      return res.status(403).json({
        error: 'Table limit reached',
        currentPlan: plan,
        limit: limits.maxTables,
        current: currentCount,
        message: `Your "${plan}" plan allows up to ${limits.maxTables} restaurant tables. You currently have ${currentCount}. Please upgrade to add more tables.`,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: check that registering a new staff member doesn't exceed the plan limit.
 * Attach to POST /api/auth/register.
 */
const checkStaffLimit = async (req, res, next) => {
  try {
    const plan = await getPropertyPlan(req);
    const limits = getPlanLimits(plan);
    if (limits.maxStaff === Infinity) return next();

    const propertyId = req.propertyId || req.user?.propertyId;
    // Count non-admin active users scoped to this property
    const countWhere = { role: { [require('sequelize').Op.ne]: 'admin' }, isActive: true };
    if (propertyId) countWhere.propertyId = propertyId;
    const currentCount = await User.count({ where: countWhere });
    if (currentCount >= limits.maxStaff) {
      return res.status(403).json({
        error: 'Staff limit reached',
        currentPlan: plan,
        limit: limits.maxStaff,
        current: currentCount,
        message: `Your "${plan}" plan allows up to ${limits.maxStaff} staff accounts. You currently have ${currentCount}. Please upgrade to add more staff.`,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  PLAN_LIMITS,
  getPlanLimits,
  getPropertyPlan,
  requirePlan,
  requireFeature,
  checkRoomLimit,
  checkTableLimit,
  checkStaffLimit,
};
