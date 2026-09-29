import { Task } from '../models/Task.js';
import { getProjectForUser, getTaskForUser, verifyUserBelongsToOrg } from '../services/access.js';
import { permissions } from '../services/permissions.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, priority, assignee, search, sort = '-createdAt' } = req.query;

  // Verifies user has access to project and org (returns 404 for non-members)
  const { project } = await getProjectForUser(projectId, req.user._id);

  // Tenant-scoped task query
  const query = {
    project: project._id,
    organization: project.organization
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignee) query.assignee = assignee;
  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
      { label: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  const tasks = await Task.find(query)
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email')
    .sort(sort);

  return sendSuccess(res, tasks);
});

export const createTask = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const { title, description = '', status, priority, assignee, dueDate, label = '' } = req.body;

  // Verifies user has access to project and org
  const { project, membership } = await getProjectForUser(projectId, req.user._id);

  // All roles (OWNER, ADMIN, MEMBER) can create tasks
  if (!permissions.canCreateTask(membership.role)) {
    return next(new AppError('You do not have permission to create tasks', 403, 'FORBIDDEN'));
  }

  // Validate assignee if provided
  let assigneeId = null;
  if (assignee) {
    const isMember = await verifyUserBelongsToOrg(project.organization, assignee);
    if (!isMember) {
      return next(
        new AppError('Assigned user must be a member of this organization', 400, 'INVALID_ASSIGNEE')
      );
    }
    assigneeId = assignee;
  }

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    project: project._id,
    organization: project.organization, // Denormalized tenant key
    assignee: assigneeId,
    createdBy: req.user._id,
    dueDate: dueDate ? new Date(dueDate) : null,
    label
  });

  const populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email');

  return sendSuccess(res, populatedTask, 201);
});

export const updateTask = asyncHandler(async (req, res, next) => {
  const { taskId } = req.params;

  // Verifies user has access to task and org (returns 404 for non-members)
  const { task, membership } = await getTaskForUser(taskId, req.user._id);

  const updates = req.body;
  const hasFullFields = ['title', 'description', 'assignee', 'dueDate', 'label'].some(
    (field) => updates[field] !== undefined
  );
  const hasStatusOrPriority = ['status', 'priority'].some((field) => updates[field] !== undefined);

  // Enforce granular RBAC per specification
  if (hasFullFields) {
    const allowed = permissions.canUpdateTaskFull(membership.role, req.user._id, task.createdBy);
    if (!allowed) {
      return next(
        new AppError(
          'Only organization owners, admins, or the task creator can update general task details',
          403,
          'FORBIDDEN'
        )
      );
    }
  }

  if (hasStatusOrPriority) {
    const allowed = permissions.canUpdateTaskStatusPriority(
      membership.role,
      req.user._id,
      task.createdBy,
      task.assignee
    );
    if (!allowed) {
      return next(
        new AppError(
          'Only organization owners, admins, the task creator, or the assignee can update status/priority',
          403,
          'FORBIDDEN'
        )
      );
    }
  }

  // If assignee is being updated, validate assignee belongs to the task's organization
  if (updates.assignee !== undefined) {
    if (updates.assignee) {
      const isMember = await verifyUserBelongsToOrg(task.organization, updates.assignee);
      if (!isMember) {
        return next(
          new AppError('Assigned user must be a member of this organization', 400, 'INVALID_ASSIGNEE')
        );
      }
      task.assignee = updates.assignee;
    } else {
      task.assignee = null;
    }
  }

  if (updates.title !== undefined) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.status !== undefined) task.status = updates.status;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
  if (updates.label !== undefined) task.label = updates.label;

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email');

  return sendSuccess(res, populatedTask);
});

export const deleteTask = asyncHandler(async (req, res, next) => {
  const { taskId } = req.params;

  // Verifies user has access to task and org
  const { task, membership } = await getTaskForUser(taskId, req.user._id);

  if (!permissions.canDeleteTask(membership.role, req.user._id, task.createdBy)) {
    return next(
      new AppError(
        'Only organization owners, admins, or the task creator can delete tasks',
        403,
        'FORBIDDEN'
      )
    );
  }

  await Task.findByIdAndDelete(task._id);

  return sendSuccess(res, { message: 'Task deleted successfully' });
});
