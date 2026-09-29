import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Membership, ROLES } from '../src/models/Membership.js';
import { Project } from '../src/models/Project.js';
import { Task, TASK_STATUS, TASK_PRIORITY } from '../src/models/Task.js';

describe('Tenant Isolation & Authorization', () => {
  let userA, userB, userDual;
  let cookieA, cookieB, cookieDual;
  let orgA, orgB;
  let projectA, projectB;
  let taskA, taskB;

  beforeEach(async () => {
    // 1. Create Users
    userA = await User.create({ name: 'User A', email: 'userA@test.com', password: 'Password@123' });
    userB = await User.create({ name: 'User B', email: 'userB@test.com', password: 'Password@123' });
    userDual = await User.create({ name: 'User Dual', email: 'userDual@test.com', password: 'Password@123' });

    // 2. Create Orgs
    orgA = await Organization.create({ name: 'Org A', createdBy: userA._id });
    orgB = await Organization.create({ name: 'Org B', createdBy: userB._id });

    // 3. Create Memberships
    await Membership.create([
      { user: userA._id, organization: orgA._id, role: ROLES.OWNER },
      { user: userB._id, organization: orgB._id, role: ROLES.OWNER },
      // userDual belongs to BOTH orgs
      { user: userDual._id, organization: orgA._id, role: ROLES.ADMIN },
      { user: userDual._id, organization: orgB._id, role: ROLES.MEMBER }
    ]);

    // 4. Create Projects
    projectA = await Project.create({
      name: 'Project Alpha',
      organization: orgA._id,
      createdBy: userA._id
    });
    projectB = await Project.create({
      name: 'Project Beta',
      organization: orgB._id,
      createdBy: userB._id
    });

    // 5. Create Tasks
    taskA = await Task.create({
      title: 'Secret Task A',
      project: projectA._id,
      organization: orgA._id,
      createdBy: userA._id,
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.HIGH
    });
    taskB = await Task.create({
      title: 'Secret Task B',
      project: projectB._id,
      organization: orgB._id,
      createdBy: userB._id,
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.HIGH
    });

    // Login users to get cookies
    const loginA = await request(app).post('/api/auth/login').send({ email: 'userA@test.com', password: 'Password@123' });
    cookieA = loginA.headers['set-cookie'];

    const loginB = await request(app).post('/api/auth/login').send({ email: 'userB@test.com', password: 'Password@123' });
    cookieB = loginB.headers['set-cookie'];

    const loginDual = await request(app).post('/api/auth/login').send({ email: 'userDual@test.com', password: 'Password@123' });
    cookieDual = loginDual.headers['set-cookie'];
  });

  it('Requirement 2: User A cannot GET Project B from Org B -> returns 404 and leaks NO data', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectB._id}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    // Ensure no sensitive project data leaked
    expect(JSON.stringify(res.body)).not.toContain('Project Beta');
    expect(JSON.stringify(res.body)).not.toContain(orgB._id.toString());
  });

  it('Requirement 3: User A cannot list projects of Org B -> returns 404', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgB._id}/projects`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Requirement 4: User A cannot create a project in Org B even if organization is supplied', async () => {
    // Attempting to post to Org B route
    const res = await request(app)
      .post(`/api/organizations/${orgB._id}/projects`)
      .set('Cookie', cookieA)
      .send({
        name: 'Hacked Project'
      });

    expect(res.status).toBe(404);

    // Attempting to post to Org A route but putting Org B ID in body (mass assignment test)
    const res2 = await request(app)
      .post(`/api/organizations/${orgA._id}/projects`)
      .set('Cookie', cookieA)
      .send({
        name: 'Normal Project',
        organization: orgB._id.toString()
      });

    // Zod strict validation rejects unexpected fields with 400
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Requirement 5: User A cannot PATCH or DELETE Task B belonging to Org B -> returns 404', async () => {
    // PATCH
    const patchRes = await request(app)
      .patch(`/api/tasks/${taskB._id}`)
      .set('Cookie', cookieA)
      .send({ title: 'Tampered Title' });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body.error.code).toBe('NOT_FOUND');

    // Verify task was not changed in DB
    const dbTask = await Task.findById(taskB._id);
    expect(dbTask.title).toBe('Secret Task B');

    // DELETE
    const delRes = await request(app)
      .delete(`/api/tasks/${taskB._id}`)
      .set('Cookie', cookieA);

    expect(delRes.status).toBe(404);
    expect(delRes.body.error.code).toBe('NOT_FOUND');

    // Verify task still exists in DB
    const exists = await Task.findById(taskB._id);
    expect(exists).not.toBeNull();
  });

  it('Requirement 9: User belonging to multiple orgs sees only each orgs data on respective requests', async () => {
    // Fetch projects for Org A
    const resA = await request(app)
      .get(`/api/organizations/${orgA._id}/projects`)
      .set('Cookie', cookieDual);

    expect(resA.status).toBe(200);
    expect(resA.body.data.length).toBe(1);
    expect(resA.body.data[0].name).toBe('Project Alpha');

    // Fetch projects for Org B
    const resB = await request(app)
      .get(`/api/organizations/${orgB._id}/projects`)
      .set('Cookie', cookieDual);

    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBe(1);
    expect(resB.body.data[0].name).toBe('Project Beta');
  });
});
