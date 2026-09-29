import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';

describe('Authentication & Security', () => {
  it('registers a new user, hashes password (bcrypt), and sets httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Cooper',
        email: 'alice@example.com',
        password: 'Password@123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.name).toBe('Alice Cooper');
    expect(res.body.data.user.password).toBeUndefined();

    // Verify httpOnly cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);

    // Verify password is NOT stored as plaintext in DB
    const dbUser = await User.findOne({ email: 'alice@example.com' }).select('+password');
    expect(dbUser).toBeDefined();
    expect(dbUser.password).not.toBe('Password@123');
    expect(dbUser.password).toMatch(/^\$2[aby]\$12\$/); // bcrypt cost 12
  });

  it('rejects registration with duplicate email with 409 Conflict', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password@123'
      });

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Duplicate',
        email: 'alice@example.com',
        password: 'Password@999'
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('CONFLICT');
  });

  it('logs in an existing user with valid credentials and sets cookie', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'Password@123'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bob@example.com',
        password: 'Password@123'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.email).toBe('bob@example.com');
    expect(loginRes.headers['set-cookie']).toBeDefined();
  });

  it('returns generic 401 for wrong password or non-existent email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'Password@123'
      });

    // Wrong password
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bob@example.com',
        password: 'WrongPassword!'
      });

    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.message).toBe('Invalid email or password');

    // Non-existent email
    const wrongEmailRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Password@123'
      });

    expect(wrongEmailRes.status).toBe(401);
    expect(wrongEmailRes.body.error.message).toBe('Invalid email or password');
  });

  it('/api/auth/me requires authentication and returns 401 when no cookie is present', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('/api/auth/me returns user and memberships when authenticated', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: 'Password@123'
      });

    const cookie = regRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('charlie@example.com');
    expect(Array.isArray(meRes.body.data.memberships)).toBe(true);
  });
});
