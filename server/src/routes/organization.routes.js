import { Router } from 'express';
import * as orgController from '../controllers/organization.controller.js';
import * as projectController from '../controllers/project.controller.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import memberRoutes from './member.routes.js';
import { authenticate } from '../middleware/authenticate.js';
import { orgAccess } from '../middleware/orgAccess.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../models/Membership.js';
import { createOrgSchema, orgParamSchema } from '../validators/organization.validator.js';
import { listProjectsSchema, createProjectSchema } from '../validators/project.validator.js';

const router = Router();

// All organization routes require authentication
router.use(authenticate);

// Top-level org operations
router.get('/', orgController.listOrganizations);
router.post('/', validate(createOrgSchema), orgController.createOrganization);

// Scoped organization routes with orgAccess middleware
const scopedOrgRouter = Router({ mergeParams: true });
scopedOrgRouter.use(validate(orgParamSchema), orgAccess);

scopedOrgRouter.get('/', orgController.getOrganization);
scopedOrgRouter.delete('/', requireRole(ROLES.OWNER), orgController.deleteOrganization);

// Dashboard stats endpoint
scopedOrgRouter.get('/stats', dashboardController.getDashboardStats);

// Mount members nested route
scopedOrgRouter.use('/members', memberRoutes);

// Org-scoped projects endpoints
scopedOrgRouter.get('/projects', validate(listProjectsSchema), projectController.listProjects);
scopedOrgRouter.post('/projects', validate(createProjectSchema), projectController.createProject);

router.use('/:organizationId', scopedOrgRouter);

export default router;
