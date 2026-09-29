import { ROLES } from '../models/Membership.js';

export const PERMISSION_ACTIONS = {
  VIEW_WORKSPACE: 'VIEW_WORKSPACE',
  MANAGE_PROJECT: 'MANAGE_PROJECT', // Create / update / delete project
  CREATE_TASK: 'CREATE_TASK',
  UPDATE_TASK_FULL: 'UPDATE_TASK_FULL',
  UPDATE_TASK_STATUS_PRIORITY: 'UPDATE_TASK_STATUS_PRIORITY',
  DELETE_TASK: 'DELETE_TASK',
  ADD_MEMBER: 'ADD_MEMBER',
  CHANGE_MEMBER_ROLE: 'CHANGE_MEMBER_ROLE',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
  DELETE_ORGANIZATION: 'DELETE_ORGANIZATION'
};

export const permissions = {
  /**
   * Can view org, members, projects, tasks
   */
  canView(role) {
    return [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER].includes(role);
  },

  /**
   * Create / update / delete project: OWNER and ADMIN only
   */
  canManageProject(role) {
    return [ROLES.OWNER, ROLES.ADMIN].includes(role);
  },

  /**
   * Create task: OWNER, ADMIN, MEMBER
   */
  canCreateTask(role) {
    return [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER].includes(role);
  },

  /**
   * Update task (all fields): OWNER, ADMIN, or MEMBER if they created it
   */
  canUpdateTaskFull(role, userId, taskCreatorId) {
    if ([ROLES.OWNER, ROLES.ADMIN].includes(role)) {
      return true;
    }
    if (role === ROLES.MEMBER && taskCreatorId) {
      return userId.toString() === taskCreatorId.toString();
    }
    return false;
  },

  /**
   * Change status/priority of a task: OWNER, ADMIN, or if creator or assignee
   */
  canUpdateTaskStatusPriority(role, userId, taskCreatorId, taskAssigneeId) {
    if ([ROLES.OWNER, ROLES.ADMIN].includes(role)) {
      return true;
    }
    if (role === ROLES.MEMBER) {
      const isCreator = taskCreatorId && userId.toString() === taskCreatorId.toString();
      const isAssignee = taskAssigneeId && userId.toString() === taskAssigneeId.toString();
      return Boolean(isCreator || isAssignee);
    }
    return false;
  },

  /**
   * Delete task: OWNER, ADMIN, or MEMBER if they created it
   */
  canDeleteTask(role, userId, taskCreatorId) {
    if ([ROLES.OWNER, ROLES.ADMIN].includes(role)) {
      return true;
    }
    if (role === ROLES.MEMBER && taskCreatorId) {
      return userId.toString() === taskCreatorId.toString();
    }
    return false;
  },

  /**
   * Add member (by email of existing user):
   * - OWNER can add ADMIN or MEMBER
   * - ADMIN can only add MEMBER
   * - MEMBER cannot add members
   */
  canAddMember(callerRole, targetRole) {
    if (callerRole === ROLES.OWNER) {
      return [ROLES.ADMIN, ROLES.MEMBER].includes(targetRole);
    }
    if (callerRole === ROLES.ADMIN) {
      return targetRole === ROLES.MEMBER;
    }
    return false;
  },

  /**
   * Change member role: OWNER only
   */
  canChangeMemberRole(callerRole) {
    return callerRole === ROLES.OWNER;
  },

  /**
   * Remove member:
   * - OWNER can remove anyone (subject to last-owner check)
   * - ADMIN can only remove MEMBERs
   * - MEMBER cannot remove members
   */
  canRemoveMember(callerRole, targetMemberRole) {
    if (callerRole === ROLES.OWNER) {
      return true;
    }
    if (callerRole === ROLES.ADMIN) {
      return targetMemberRole === ROLES.MEMBER;
    }
    return false;
  },

  /**
   * Delete organization: OWNER only
   */
  canDeleteOrganization(callerRole) {
    return callerRole === ROLES.OWNER;
  }
};
