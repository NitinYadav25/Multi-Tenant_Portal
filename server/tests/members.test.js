import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Membership, ROLES } from '../src/models/Membership.js';

describe('Member Management & Last Owner Protection', () => {
  let owner, admin, member, newGuy;
  let ownerCookie, adminCookie, memberCookie;
  let org;

  beforeEach(async () => {
    owner = await User.create({ name: 'Owner', email: 'owner@test.com', password: 'Password@123' });
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Password@123' });
    member = await User.create({ name: 'Member', email: 'member@test.com', password: 'Password@123' });
    newGuy = await User.create({ name: 'New Guy', email: 'newguy@test.com', password: 'Password@123' });

    org = await Organization.create({ name: 'Member Org', createdBy: owner._id });

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

  it('Requirement 8: Last owner cannot be demoted to Admin or Member -> returns 409', async () => {
    const res = await request(app)
      .patch(`/api/organizations/${org._id}/members/${owner._id}`)
      .set('Cookie', ownerCookie)
      .send({ role: ROLES.ADMIN });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LAST_OWNER_PROTECTION');

    // Verify role remained OWNER
    const dbMembership = await Membership.findOne({ user: owner._id, organization: org._id });
    expect(dbMembership.role).toBe(ROLES.OWNER);
  });

  it('Requirement 8: Last owner cannot be removed from organization -> returns 409', async () => {
    const res = await request(app)
      .delete(`/api/organizations/${org._id}/members/${owner._id}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LAST_OWNER_PROTECTION');
  });

  it('ADMIN can invite an existing user with MEMBER role', async () => {
    const res = await request(app)
      .post(`/api/organizations/${org._id}/members`)
      .set('Cookie', adminCookie)
      .send({
        email: 'newguy@test.com',
        role: ROLES.MEMBER
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe(ROLES.MEMBER);
    expect(res.body.data.user.email).toBe('newguy@test.com');
  });

  it('ADMIN cannot invite a user with ADMIN role -> 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/organizations/${org._id}/members`)
      .set('Cookie', adminCookie)
      .send({
        email: 'newguy@test.com',
        role: ROLES.ADMIN
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('MEMBER cannot invite members -> 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/organizations/${org._id}/members`)
      .set('Cookie', memberCookie)
      .send({
        email: 'newguy@test.com',
        role: ROLES.MEMBER
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
