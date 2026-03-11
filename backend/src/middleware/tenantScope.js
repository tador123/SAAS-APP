/**
 * Multi-tenancy middleware — extracts the property (tenant) context
 * from the authenticated user's profile and attaches it to the request.
 *
 * Usage:
 *   router.get('/rooms', authenticate, tenantScope, ...)
 *
 * After this middleware, `req.propertyId` is available for scoping queries:
 *   Room.findAll({ where: { propertyId: req.propertyId, ... } })
 *
 * Strategy:
 *   1. Read `propertyId` from `req.user.propertyId` (set during login).
 *   2. Alternatively, admins can pass `X-Property-Id` header to switch context.
 */
const tenantScope = (req, res, next) => {
  // system_admin can operate on any property (via header) or globally
  if (req.user?.role === 'system_admin') {
    req.propertyId = req.headers['x-property-id']
      ? parseInt(req.headers['x-property-id'], 10)
      : req.user.propertyId || null;
    return next();
  }

  // Default: use the user's assigned property
  let propertyId = req.user?.propertyId;

  // Admins & super-users can override via header (e.g., for multi-property dashboards)
  if (req.user?.role === 'admin' && req.headers['x-property-id']) {
    propertyId = parseInt(req.headers['x-property-id'], 10);
  }

  if (!propertyId) {
    return res.status(403).json({ error: 'No property context. User is not assigned to a property.' });
  }

  req.propertyId = propertyId;
  next();
};

/**
 * Optional tenant scope — same as tenantScope but doesn't block
 * requests without a property (useful for global admin endpoints).
 */
const optionalTenantScope = (req, res, next) => {
  if (req.user?.role === 'system_admin') {
    req.propertyId = req.headers['x-property-id']
      ? parseInt(req.headers['x-property-id'], 10)
      : null;
    return next();
  }

  let propertyId = req.user?.propertyId;

  if (req.user?.role === 'admin' && req.headers['x-property-id']) {
    propertyId = parseInt(req.headers['x-property-id'], 10);
  }

  req.propertyId = propertyId || null;
  next();
};

module.exports = { tenantScope, optionalTenantScope };
