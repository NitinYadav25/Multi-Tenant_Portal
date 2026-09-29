import mongoose from 'mongoose';
import { Membership } from '../models/Membership.js';
import { Organization } from '../models/Organization.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware for org-scoped routes (/api/organizations/:organizationId/...)
 * Ensures caller is an active member of the target organization.
 * Non-members receive 404 Not Found to prevent leaking the existence of the organization.
 */
export const orgAccess = asyncHandler(async (req, res, next) => {
  const { organizationId } = req.params;

  if (!organizationId || !mongoose.isValidObjectId(organizationId)) {
    return next(new AppError('Invalid Organization ID', 400, 'INVALID_ID'));
  }

  // Load organization and membership in parallel
  const [organization, membership] = await Promise.all([
    Organization.findById(organizationId),
    Membership.findOne({
      user: req.user._id,
      organization: organizationId
    })
  ]);

  // If organization does not exist OR user is not a member, return 404 (zero existence leakage)
  if (!organization || !membership) {
    return next(new AppError('Organization not found', 404, 'NOT_FOUND'));
  }

  // Attach to request for downstream handlers
  req.organization = organization;
  req.membership = membership;
  next();
});
