import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Membership, ROLES } from '../src/models/Membership.js';
import { Project } from '../src/models/Project.js';
import { Task } from '../src/models/Task.js';

describe('Project Management & RBAC', () => {
  let owner, admin, member;
  let ownerCookie, adminCookie, memberCookie;
  let org;

  beforeEach(async () => {
    owner = await User.create({ name: 'Org Owner', email: 'owner@test.com', password: 'Password@123' });
    admin = await User.create({ name: 'Org Admin', email: 'admin@test.com', password: 'Password@123' });
    member = await User.create({ name: 'Org Member', email: 'member@test.com', password: 'Password@123' });

    org = await Organization.create({ name: 'Test Org', createdBy: owner._id });

    await Membership.create([
      { user: owner._id, organization: org._id, role: ROLES.OWNER },
      { user: admin._id, organization: org._id, role: ROLES.ADMIN },
      { user: member._id, organization: org._id, role: ROLES.MEMBER }
    ]);

    const l1 = await request(app).post('/api/auth/login').send({ email: 'owner@test.com', password: 'Password@123' });
    ownerCookie = l1.headers['set-cookie'];

    const l2 = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Password@123' });
    adminCookie = l2.headers['set-cookie'];

    const l3 = await request(app).post('/api/auth/login').send({ email: 'member@test.com', password: 'Password@123' });
    memberCookie = l3.headers['set-cookie'];
  });

  it('Requirement 7: MEMBER cannot create projects -> 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/organizations/${org._id}/projects`)
      .set('Cookie', memberCookie)
      .send({ name: 'Member Project' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Requirement 7: ADMIN can create and delete projects', async () => {
    // Create by admin
    const createRes = await request(app)
      .post(`/api/organizations/${org._id}/projects`)
      .set('Cookie', adminCookie)
      .send({ name: 'Admin Project', description: 'Created by Admin' });

    expect(createRes.status).toBe(201);
    const projectId = createRes.body.data.id;

    // Delete by admin
    const deleteRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Cookie', adminCookie);

    expect(deleteRes.status).toBe(200);
    const exists = await Project.findById(projectId);
    expect(exists).toBeNull();
  });

  it('Deleting a project cascades and deletes all its tasks', async () => {
    const project = await Project.create({
      name: 'To Be Deleted',
      organization: org._id,
      createdBy: owner._id
    });

    const task1 = await Task.create({
      title: 'Task 1',
      project: project._id,
      organization: org._id,
      createdBy: owner._id
    });

    const task2 = await Task.create({
      title: 'Task 2',
      project: project._id,
      organization: org._id,
      createdBy: owner._id
    });

    // Delete project
    const res = await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(200);

    // Verify tasks are deleted
    const remainingTasks = await Task.find({ project: project._id });
    expect(remainingTasks.length).toBe(0);
  });
});
