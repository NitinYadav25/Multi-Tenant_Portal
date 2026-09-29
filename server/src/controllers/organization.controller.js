import { Organization } from '../models/Organization.js';
import { Membership, ROLES } from '../models/Membership.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listOrganizations = asyncHandler(async (req, res) => {
  // Query all memberships for current user
  const memberships = await Membership.find({ user: req.user._id })
    .populate('organization')
    .sort({ createdAt: -1 });

  // For each organization, fetch member count
  const orgList = await Promise.all(
    memberships
      .filter((m) => m.organization != null)
      .map(async (m) => {
        const memberCount = await Membership.countDocuments({ organization: m.organization._id });
        return {
          id: m.organization._id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
          memberCount,
          createdAt: m.organization.createdAt
        };
      })
  );

  return sendSuccess(res, orgList);
});

export const createOrganization = asyncHandler(async (req, res) => {
  const { name } = req.body;

  // Create organization
  const organization = await Organization.create({
    name,
    createdBy: req.user._id
  });

  // Automatically assign OWNER membership to creator
  const membership = await Membership.create({
    user: req.user._id,
    organization: organization._id,
    role: ROLES.OWNER
  });

  return sendSuccess(
    res,
    {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      role: membership.role,
      memberCount: 1,
      createdAt: organization.createdAt
    },
    201
  );
});

export const getOrganization = asyncHandler(async (req, res) => {
  // req.organization and req.membership are provided by orgAccess middleware
  const memberCount = await Membership.countDocuments({ organization: req.organization._id });

  return sendSuccess(res, {
    id: req.organization._id,
    name: req.organization.name,
    slug: req.organization.slug,
    role: req.membership.role,
    memberCount,
    createdAt: req.organization.createdAt
  });
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;

  // Cascade delete all tasks, projects, memberships, and the organization itself
  await Promise.all([
    Task.deleteMany({ organization: orgId }),
    Project.deleteMany({ organization: orgId }),
    Membership.deleteMany({ organization: orgId }),
    Organization.findByIdAndDelete(orgId)
  ]);

  return sendSuccess(res, { message: 'Organization deleted successfully' });
});
