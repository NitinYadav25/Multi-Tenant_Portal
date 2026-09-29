import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Organization } from '../models/Organization.js';
import { Membership } from '../models/Membership.js';
import { AppError } from '../utils/AppError.js';

/**
 * Validates MongoDB ObjectId
 */
export const assertValidObjectId = (id, paramName = 'ID') => {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${paramName} format`, 400, 'INVALID_ID');
  }
};

/**
 * Loads project and verifies user has active membership in the project's organization.
 * Strict disclosure strategy: Non-members receive 404 Not Found to prevent leaking existence.
 * Returns { project, membership }
 */
export const getProjectForUser = async (projectId, userId, populateOptions = []) => {
  assertValidObjectId(projectId, 'Project ID');

  let query = Project.findById(projectId);
  if (populateOptions.length > 0) {
    populateOptions.forEach((pop) => {
      query = query.populate(pop);
    });
  }

  const project = await query;
  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  // Verify membership in the project's organization
  const membership = await Membership.findOne({
    user: userId,
    organization: project.organization
  });

  if (!membership) {
    // Return 404 so caller cannot distinguish between non-existent project and unauthorized project
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return { project, membership };
};

/**
 * Loads task and verifies user has active membership in the task's organization.
 * Strict disclosure strategy: Non-members receive 404 Not Found to prevent leaking existence.
 * Returns { task, membership }
 */
export const getTaskForUser = async (taskId, userId, populateOptions = []) => {
  assertValidObjectId(taskId, 'Task ID');

  let query = Task.findById(taskId);
  if (populateOptions.length > 0) {
    populateOptions.forEach((pop) => {
      query = query.populate(pop);
    });
  }

  const task = await query;
  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  // Verify membership in the task's organization
  const membership = await Membership.findOne({
    user: userId,
    organization: task.organization
  });

  if (!membership) {
    // Return 404 to avoid leaking existence
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  return { task, membership };
};

/**
 * Verifies caller has active membership in the specified organization.
 * Returns { organization, membership }
 */
export const verifyOrgMembership = async (organizationId, userId) => {
  assertValidObjectId(organizationId, 'Organization ID');

  const [organization, membership] = await Promise.all([
    Organization.findById(organizationId),
    Membership.findOne({ user: userId, organization: organizationId })
  ]);

  if (!organization || !membership) {
    throw new AppError('Organization not found', 404, 'NOT_FOUND');
  }

  return { organization, membership };
};

/**
 * Verifies that a target user (e.g. assignee) belongs to the specified organization.
 */
export const verifyUserBelongsToOrg = async (organizationId, targetUserId) => {
  assertValidObjectId(organizationId, 'Organization ID');
  assertValidObjectId(targetUserId, 'User ID');

  const membership = await Membership.findOne({
    user: targetUserId,
    organization: organizationId
  });

  return Boolean(membership);
};
