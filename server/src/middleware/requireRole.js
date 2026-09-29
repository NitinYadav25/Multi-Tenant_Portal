import { AppError } from '../utils/AppError.js';

/**
 * Middleware ensuring the authenticated member has one of the required roles.
 * Must be used after orgAccess (or when req.membership is set).
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership) {
      return next(new AppError('Organization membership context is required', 500, 'INTERNAL_ERROR'));
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return next(
        new AppError(
          `Action requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${req.membership.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
