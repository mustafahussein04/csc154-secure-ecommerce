const ROLES = ['sysadmin', 'webadmin', 'merchant', 'buyer'];

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Insufficient privileges for this action.' });
    }
    next();
  };
}

module.exports = { ROLES, requireAuth, requireRole };