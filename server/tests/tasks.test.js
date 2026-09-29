import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Membership, ROLES } from '../src/models/Membership.js';
import { Project } from '../src/models/Project.js';
import { Task, TASK_STATUS, TASK_PRIORITY } from '../src/models/Task.js';

describe('Task Management & Tenant Validation', () => {
  let owner, member, outsider;
  let ownerCookie, memberCookie;
  let org;
  let project;

  beforeEach(async () => {
    owner = await User.create({ name: 'Owner', email: 'owner@test.com', password: 'Password@123' });
    member = await User.create({ name: 'Member', email: 'member@test.com', password: 'Password@123' });
    outsider = await User.create({ name: 'Outsider', email: 'outsider@test.com', password: 'Password@123' });

    org = await Organization.create({ name: 'Task Org', createdBy: owner._id });

    await Membership.create([
      { user: owner._id, organization: org._id, role: ROLES.OWNER },
      { user: member._id, organization: org._id, role: ROLES.MEMBER }
    ]);

    project = await Project.create({
      name: 'Task Project',
      organization: org._id,
      createdBy: owner._id
    });

    const l1 = await request(app).post('/api/auth/login').send({ email: 'owner@test.com', password: 'Password@123' });
    ownerCookie = l1.headers['set-cookie'];

    const l2 = await request(app).post('/api/auth/login').send({ email: 'member@test.com', password: 'Password@123' });
    memberCookie = l2.headers['set-cookie'];
  });

  it('Requirement 6: Cannot assign a task to a user who is NOT a member of that org -> 400', async () => {
    // Attempt to assign to outsider on creation
    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Task with outsider',
        assignee: outsider._id.toString()
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNEE');
  });

  it('Allows assigning task to a valid member of the organization', async () => {
    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Task with member',
        priority: TASK_PRIORITY.HIGH,
        assignee: member._id.toString()
      });

    expect(res.status).toBe(201);
    expect(res.body.data.assignee.id || res.body.data.assignee._id).toBe(member._id.toString());
  });

  it('Assignee can change status of a task even if not creator', async () => {
    // Created by owner, assigned to member
    const task = await Task.create({
      title: 'Work on this',
      project: project._id,
      organization: org._id,
      createdBy: owner._id,
      assignee: member._id,
      status: TASK_STATUS.TODO
    });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Cookie', memberCookie)
      .send({
        status: TASK_STATUS.IN_PROGRESS
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(TASK_STATUS.IN_PROGRESS);
  });

  it('Member who is neither creator nor assignee cannot change status -> 403', async () => {
    // Create another member in same org
    const otherMember = await User.create({ name: 'Other', email: 'other@test.com', password: 'Password@123' });
    await Membership.create({ user: otherMember._id, organization: org._id, role: ROLES.MEMBER });
    const lOther = await request(app).post('/api/auth/login').send({ email: 'other@test.com', password: 'Password@123' });
    const otherCookie = lOther.headers['set-cookie'];

    // Task created by owner, assigned to member
    const task = await Task.create({
      title: 'Owner task',
      project: project._id,
      organization: org._id,
      createdBy: owner._id,
      assignee: member._id,
      status: TASK_STATUS.TODO
    });

    // Other member tries to update status
    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Cookie', otherCookie)
      .send({ status: TASK_STATUS.DONE });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
