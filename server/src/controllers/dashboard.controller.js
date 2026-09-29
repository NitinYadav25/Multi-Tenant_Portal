import { Project } from '../models/Project.js';
import { Task, TASK_STATUS } from '../models/Task.js';
import { Membership } from '../models/Membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const orgId = req.organization._id;

  const [projectCount, openTasksCount, completedTasksCount, memberCount, recentTasks] =
    await Promise.all([
      Project.countDocuments({ organization: orgId }),
      Task.countDocuments({
        organization: orgId,
        status: { $in: [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS] }
      }),
      Task.countDocuments({
        organization: orgId,
        status: TASK_STATUS.DONE
      }),
      Membership.countDocuments({ organization: orgId }),
      Task.find({ organization: orgId })
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email')
        .populate('project', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
    ]);

  const recentActivity = recentTasks.map((t) => {
    const actor = t.assignee?.name || t.createdBy?.name || 'A team member';
    let actionText = '';
    if (t.status === TASK_STATUS.DONE) {
      actionText = `marked "${t.title}" as Done`;
    } else if (t.status === TASK_STATUS.IN_PROGRESS) {
      actionText = `is working on "${t.title}"`;
    } else {
      actionText = `created task "${t.title}"`;
    }

    return {
      id: t._id,
      actor,
      action: actionText,
      project: t.project?.name || 'Project',
      updatedAt: t.updatedAt
    };
  });

  return sendSuccess(res, {
    projects: projectCount,
    openTasks: openTasksCount,
    members: memberCount,
    completedTasks: completedTasksCount,
    recentActivity
  });
});
