import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Membership, ROLES } from '../models/Membership.js';
import { Project } from '../models/Project.js';
import { Task, TASK_STATUS, TASK_PRIORITY } from '../models/Task.js';

export const seedData = async () => {
  console.log('🌱 Starting database seed...');

  // Wipe existing collections
  await Promise.all([
    Task.deleteMany({}),
    Project.deleteMany({}),
    Membership.deleteMany({}),
    Organization.deleteMany({}),
    User.deleteMany({})
  ]);
  console.log('🧹 Cleaned existing database collections');

  const defaultPassword = 'Demo@12345';

  // 1. Create Users
  const users = await User.create([
    { name: 'Demo User', email: 'demo@example.com', password: defaultPassword },
    { name: 'Riya Sharma', email: 'riya@acme.com', password: defaultPassword },
    { name: 'Aman Verma', email: 'aman@acme.com', password: defaultPassword },
    { name: 'Neha Singh', email: 'neha@acme.com', password: defaultPassword },
    { name: 'Karan Mehta', email: 'karan@beta.io', password: defaultPassword },
    { name: 'Pooja Nair', email: 'pooja@beta.io', password: defaultPassword },
    { name: 'Outsider User', email: 'outsider@example.com', password: defaultPassword }
  ]);

  const userMap = {};
  users.forEach((u) => {
    userMap[u.email] = u;
  });
  console.log(`👤 Created ${users.length} seed users`);

  // 2. Create Organizations
  const [acmeOrg, betaOrg] = await Promise.all([
    Organization.create({
      name: 'Acme Inc.',
      slug: 'acme-inc',
      createdBy: userMap['demo@example.com']._id
    }),
    Organization.create({
      name: 'Beta Labs',
      slug: 'beta-labs',
      createdBy: userMap['karan@beta.io']._id
    })
  ]);
  console.log('🏢 Created organizations: Acme Inc. & Beta Labs');

  // 3. Create Memberships
  // Acme Inc.: Demo (OWNER), Riya (ADMIN), Aman (MEMBER), Neha (MEMBER)
  // Beta Labs: Karan (OWNER), Pooja (ADMIN), Demo (MEMBER)
  await Membership.create([
    {
      user: userMap['demo@example.com']._id,
      organization: acmeOrg._id,
      role: ROLES.OWNER
    },
    {
      user: userMap['riya@acme.com']._id,
      organization: acmeOrg._id,
      role: ROLES.ADMIN
    },
    {
      user: userMap['aman@acme.com']._id,
      organization: acmeOrg._id,
      role: ROLES.MEMBER
    },
    {
      user: userMap['neha@acme.com']._id,
      organization: acmeOrg._id,
      role: ROLES.MEMBER
    },
    {
      user: userMap['karan@beta.io']._id,
      organization: betaOrg._id,
      role: ROLES.OWNER
    },
    {
      user: userMap['pooja@beta.io']._id,
      organization: betaOrg._id,
      role: ROLES.ADMIN
    },
    {
      user: userMap['demo@example.com']._id,
      organization: betaOrg._id,
      role: ROLES.MEMBER
    }
  ]);
  console.log('👥 Created organization memberships and assigned roles');

  // 4. Create Projects
  const [acmeP1, acmeP2, acmeP3, betaP1, betaP2] = await Promise.all([
    Project.create({
      name: 'Website Redesign',
      description: 'Revamp marketing site with the new brand system.',
      organization: acmeOrg._id,
      createdBy: userMap['demo@example.com']._id
    }),
    Project.create({
      name: 'Mobile Application',
      description: 'Customer-facing iOS and Android app.',
      organization: acmeOrg._id,
      createdBy: userMap['riya@acme.com']._id
    }),
    Project.create({
      name: 'Internal Tools',
      description: 'Admin dashboards and automations.',
      organization: acmeOrg._id,
      createdBy: userMap['demo@example.com']._id
    }),
    Project.create({
      name: 'Research Portal',
      description: 'Data collection tools for the lab team.',
      organization: betaOrg._id,
      createdBy: userMap['karan@beta.io']._id
    }),
    Project.create({
      name: 'API Gateway',
      description: 'Rate limiting and auth proxy layer.',
      organization: betaOrg._id,
      createdBy: userMap['pooja@beta.io']._id
    })
  ]);
  console.log('📁 Created 5 seed projects across tenants');

  // 5. Create Tasks
  const now = new Date();
  const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const tasksToSeed = [
    // Acme - Website Redesign
    {
      title: 'Design homepage hero',
      description: 'Create high-fidelity mockups for hero with 3D elements and dark mode aesthetics.',
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.HIGH,
      project: acmeP1._id,
      organization: acmeOrg._id,
      assignee: userMap['riya@acme.com']._id,
      createdBy: userMap['demo@example.com']._id,
      label: 'Design',
      dueDate: addDays(4)
    },
    {
      title: 'Write pricing page copy',
      description: 'Draft conversion-focused value proposition copy and FAQ section.',
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.LOW,
      project: acmeP1._id,
      organization: acmeOrg._id,
      assignee: userMap['aman@acme.com']._id,
      createdBy: userMap['demo@example.com']._id,
      label: 'Content',
      dueDate: addDays(9)
    },
    {
      title: 'Build responsive navbar',
      description: 'Implement mobile drawer, glassmorphism blur effect, and keyboard navigation.',
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      project: acmeP1._id,
      organization: acmeOrg._id,
      assignee: userMap['neha@acme.com']._id,
      createdBy: userMap['riya@acme.com']._id,
      label: 'Frontend',
      dueDate: addDays(2)
    },
    {
      title: 'Set up analytics events',
      description: 'Add telemetry for CTA clicks, conversion funnel drop-offs, and page performance.',
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      project: acmeP1._id,
      organization: acmeOrg._id,
      assignee: userMap['demo@example.com']._id,
      createdBy: userMap['demo@example.com']._id,
      label: 'Data',
      dueDate: addDays(6)
    },
    {
      title: 'Finalize color palette',
      description: 'Select primary gradients, neutral slate shades, and accessible contrast ratios.',
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.LOW,
      project: acmeP1._id,
      organization: acmeOrg._id,
      assignee: userMap['riya@acme.com']._id,
      createdBy: userMap['riya@acme.com']._id,
      label: 'Design',
      dueDate: addDays(-3)
    },

    // Acme - Mobile Application
    {
      title: 'Setup React Native boilerplate',
      description: 'Initialize clean repository with TypeScript, React Navigation, and testing setup.',
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.HIGH,
      project: acmeP2._id,
      organization: acmeOrg._id,
      assignee: userMap['neha@acme.com']._id,
      createdBy: userMap['riya@acme.com']._id,
      label: 'Mobile',
      dueDate: addDays(-5)
    },
    {
      title: 'Integrate OAuth 2.0 flow',
      description: 'Enable PKCE social login for Apple and Google authentication.',
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      project: acmeP2._id,
      organization: acmeOrg._id,
      assignee: userMap['demo@example.com']._id,
      createdBy: userMap['demo@example.com']._id,
      label: 'Auth',
      dueDate: addDays(5)
    },
    {
      title: 'Push notifications service',
      description: 'Configure APNS and Firebase Cloud Messaging for transactional push updates.',
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.MEDIUM,
      project: acmeP2._id,
      organization: acmeOrg._id,
      assignee: userMap['aman@acme.com']._id,
      createdBy: userMap['neha@acme.com']._id,
      label: 'Backend',
      dueDate: addDays(8)
    },

    // Acme - Internal Tools
    {
      title: 'Admin user metrics dashboard',
      description: 'Real-time charts tracking DAU, MAU, retention cohorts, and server health.',
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.MEDIUM,
      project: acmeP3._id,
      organization: acmeOrg._id,
      assignee: userMap['demo@example.com']._id,
      createdBy: userMap['demo@example.com']._id,
      label: 'Analytics',
      dueDate: addDays(7)
    },
    {
      title: 'Bulk member export to CSV',
      description: 'Generate streaming CSV report of organization members with audit details.',
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.LOW,
      project: acmeP3._id,
      organization: acmeOrg._id,
      assignee: userMap['riya@acme.com']._id,
      createdBy: userMap['demo@example.com']._id,
      label: 'Features',
      dueDate: addDays(3)
    },
    {
      title: 'Database indexing and cleanup',
      description: 'Ensure compound indexes on tenant collections and optimize query latency.',
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.HIGH,
      project: acmeP3._id,
      organization: acmeOrg._id,
      assignee: userMap['aman@acme.com']._id,
      createdBy: userMap['aman@acme.com']._id,
      label: 'Infra',
      dueDate: addDays(-2)
    },

    // Beta Labs - Research Portal
    {
      title: 'Define rate limit rules',
      description: 'Implement sliding window algorithm with Redis cluster support.',
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.HIGH,
      project: betaP1._id,
      organization: betaOrg._id,
      assignee: userMap['pooja@beta.io']._id,
      createdBy: userMap['karan@beta.io']._id,
      label: 'Backend',
      dueDate: addDays(5)
    },
    {
      title: 'Implement JWT verification',
      description: 'Strict httpOnly cookie parsing and token revocation checks.',
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      project: betaP1._id,
      organization: betaOrg._id,
      assignee: userMap['demo@example.com']._id,
      createdBy: userMap['karan@beta.io']._id,
      label: 'Security',
      dueDate: addDays(3)
    },
    {
      title: 'Provision staging env',
      description: 'Configure automated pipeline with isolated MongoDB Atlas sandbox.',
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.MEDIUM,
      project: betaP1._id,
      organization: betaOrg._id,
      assignee: userMap['karan@beta.io']._id,
      createdBy: userMap['karan@beta.io']._id,
      label: 'DevOps',
      dueDate: addDays(-4)
    },
    {
      title: 'Docs skeleton',
      description: 'Structure OpenAPI 3.0 specs and interactive Swagger explorer.',
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.LOW,
      project: betaP1._id,
      organization: betaOrg._id,
      assignee: userMap['pooja@beta.io']._id,
      createdBy: userMap['pooja@beta.io']._id,
      label: 'Docs',
      dueDate: addDays(-6)
    },

    // Beta Labs - API Gateway
    {
      title: 'Ingress reverse proxy configuration',
      description: 'Route requests dynamically based on tenant subdomain headers.',
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      project: betaP2._id,
      organization: betaOrg._id,
      assignee: userMap['karan@beta.io']._id,
      createdBy: userMap['karan@beta.io']._id,
      label: 'Gateway',
      dueDate: addDays(4)
    },
    {
      title: 'SSL certificate auto-renewal',
      description: 'Set up Let’s Encrypt certbot cron with cloud DNS challenges.',
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.MEDIUM,
      project: betaP2._id,
      organization: betaOrg._id,
      assignee: userMap['pooja@beta.io']._id,
      createdBy: userMap['karan@beta.io']._id,
      label: 'Security',
      dueDate: addDays(10)
    },
    {
      title: 'Health check ping endpoint',
      description: 'Lightweight liveness probe checking memory, DB, and event loop lag.',
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.LOW,
      project: betaP2._id,
      organization: betaOrg._id,
      assignee: userMap['demo@example.com']._id,
      createdBy: userMap['pooja@beta.io']._id,
      label: 'API',
      dueDate: addDays(-1)
    }
  ];

  await Task.create(tasksToSeed);
  console.log(`✅ Successfully seeded ${tasksToSeed.length} tasks!`);
  console.log('🎉 Seed complete! Demo credentials: demo@example.com / Demo@12345');
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedData();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during seeding:', err);
      process.exit(1);
    }
  })();
}
