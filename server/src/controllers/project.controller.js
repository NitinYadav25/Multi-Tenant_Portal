import { Project } from '../models/Project.js';
import { Task, TASK_STATUS } from '../models/Task.js';
import { permissions } from '../services/permissions.js';
import { getProjectForUser } from '../services/access.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listProjects = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const orgId = req.organization._id;

  // Build tenant-scoped query
  const query = { organization: orgId };
  if (search && search.trim()) {
    query.name = { $regex: search.trim(), $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Project.countDocuments(query)
  ]);

  // Enrich projects with task statistics (task count, completed count)
  const enrichedProjects = await Promise.all(
    projects.map(async (p) => {
      const [totalTasks, completedTasks] = await Promise.all([
        Task.countDocuments({ project: p._id, organization: orgId }),
        Task.countDocuments({ project: p._id, organization: orgId, status: TASK_STATUS.DONE })
      ]);

      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p._id,
        name: p.name,
        description: p.description,
        organization: p.organization,
        createdBy: p.createdBy,
        totalTasks,
        completedTasks,
        progress,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    })
  );

  return sendSuccess(res, enrichedProjects, 200, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit)
  });
});

export const createProject = asyncHandler(async (req, res, next) => {
  const callerRole = req.membership.role;

  if (!permissions.canManageProject(callerRole)) {
    return next(new AppError('Only organization owners and admins can create projects', 403, 'FORBIDDEN'));
  }

  const { name, description = '' } = req.body;

  const project = await Project.create({
    name,
    description,
    organization: req.organization._id,
    createdBy: req.user._id
  });

  return sendSuccess(
    res,
    {
      id: project._id,
      name: project.name,
      description: project.description,
      organization: project.organization,
      createdBy: req.user._id,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    201
  );
});

export const getProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Uses getProjectForUser to strictly verify tenant membership (throws 404 for non-members)
  const { project } = await getProjectForUser(projectId, req.user._id, [
    { path: 'createdBy', select: 'name email' }
  ]);

  const [totalTasks, completedTasks] = await Promise.all([
    Task.countDocuments({ project: project._id, organization: project.organization }),
    Task.countDocuments({ project: project._id, organization: project.organization, status: TASK_STATUS.DONE })
  ]);

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return sendSuccess(res, {
    id: project._id,
    name: project.name,
    description: project.description,
    organization: project.organization,
    createdBy: project.createdBy,
    totalTasks,
    completedTasks,
    progress,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  });
});

export const updateProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  const { project, membership } = await getProjectForUser(projectId, req.user._id);

  if (!permissions.canManageProject(membership.role)) {
    return next(new AppError('Only organization owners and admins can update projects', 403, 'FORBIDDEN'));
  }

  const { name, description } = req.body;

  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;

  await project.save();

  return sendSuccess(res, {
    id: project._id,
    name: project.name,
    description: project.description,
    organization: project.organization,
    createdBy: project.createdBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  });
});

export const deleteProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  const { project, membership } = await getProjectForUser(projectId, req.user._id);

  if (!permissions.canManageProject(membership.role)) {
    return next(new AppError('Only organization owners and admins can delete projects', 403, 'FORBIDDEN'));
  }

  // Cascade delete all tasks inside this project (with tenant filter)
  await Task.deleteMany({
    project: project._id,
    organization: project.organization
  });

  await Project.findByIdAndDelete(project._id);

  return sendSuccess(res, { message: 'Project and associated tasks deleted successfully' });
});
