import { Membership, ROLES } from '../models/Membership.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { permissions } from '../services/permissions.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listMembers = asyncHandler(async (req, res) => {
  const members = await Membership.find({ organization: req.organization._id })
    .populate('user', 'name email createdAt')
    .sort({ createdAt: 1 });

  const formattedMembers = members
    .filter((m) => m.user != null)
    .map((m) => ({
      id: m._id,
      role: m.role,
      user: {
        id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        createdAt: m.user.createdAt
      },
      createdAt: m.createdAt
    }));

  return sendSuccess(res, formattedMembers);
});

export const addMember = asyncHandler(async (req, res, next) => {
  const { email, role = ROLES.MEMBER } = req.body;
  const callerRole = req.membership.role;

  // Authorization check per matrix
  if (!permissions.canAddMember(callerRole, role)) {
    return next(
      new AppError(
        `Role ${callerRole} is not authorized to invite members with role ${role}`,
        403,
        'FORBIDDEN'
      )
    );
  }

  // Find user by email
  const targetUser = await User.findOne({ email });
  if (!targetUser) {
    return next(new AppError('No user found with the provided email address', 404, 'USER_NOT_FOUND'));
  }

  // Check if target user is already a member
  const existingMembership = await Membership.findOne({
    user: targetUser._id,
    organization: req.organization._id
  });

  if (existingMembership) {
    return next(new AppError('User is already a member of this organization', 409, 'ALREADY_MEMBER'));
  }

  // Create membership
  const membership = await Membership.create({
    user: targetUser._id,
    organization: req.organization._id,
    role
  });

  return sendSuccess(
    res,
    {
      id: membership._id,
      role: membership.role,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      },
      createdAt: membership.createdAt
    },
    201
  );
});

export const updateMemberRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;
  const callerRole = req.membership.role;

  // Check permission: OWNER only
  if (!permissions.canChangeMemberRole(callerRole)) {
    return next(new AppError('Only organization owners can modify member roles', 403, 'FORBIDDEN'));
  }

  // Find target membership
  const targetMembership = await Membership.findOne({
    user: userId,
    organization: req.organization._id
  }).populate('user', 'name email');

  if (!targetMembership) {
    return next(new AppError('Member not found in this organization', 404, 'NOT_FOUND'));
  }

  // Last-owner protection
  if (targetMembership.role === ROLES.OWNER && role !== ROLES.OWNER) {
    const ownerCount = await Membership.countDocuments({
      organization: req.organization._id,
      role: ROLES.OWNER
    });

    if (ownerCount <= 1) {
      return next(
        new AppError('Cannot demote the last owner of the organization', 409, 'LAST_OWNER_PROTECTION')
      );
    }
  }

  targetMembership.role = role;
  await targetMembership.save();

  return sendSuccess(res, {
    id: targetMembership._id,
    role: targetMembership.role,
    user: {
      id: targetMembership.user._id,
      name: targetMembership.user.name,
      email: targetMembership.user.email
    },
    updatedAt: targetMembership.updatedAt
  });
});

export const removeMember = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const callerRole = req.membership.role;

  // Find target membership
  const targetMembership = await Membership.findOne({
    user: userId,
    organization: req.organization._id
  });

  if (!targetMembership) {
    return next(new AppError('Member not found in this organization', 404, 'NOT_FOUND'));
  }

  // Check authorization per matrix
  if (!permissions.canRemoveMember(callerRole, targetMembership.role)) {
    return next(
      new AppError(
        `Role ${callerRole} is not authorized to remove ${targetMembership.role}`,
        403,
        'FORBIDDEN'
      )
    );
  }

  // Last-owner protection
  if (targetMembership.role === ROLES.OWNER) {
    const ownerCount = await Membership.countDocuments({
      organization: req.organization._id,
      role: ROLES.OWNER
    });

    if (ownerCount <= 1) {
      return next(
        new AppError('Cannot remove the last owner of the organization', 409, 'LAST_OWNER_PROTECTION')
      );
    }
  }

  // Unassign any tasks assigned to this user in this organization
  await Task.updateMany(
    { organization: req.organization._id, assignee: userId },
    { assignee: null }
  );

  await Membership.findByIdAndDelete(targetMembership._id);

  return sendSuccess(res, { message: 'Member removed successfully from organization' });
});
