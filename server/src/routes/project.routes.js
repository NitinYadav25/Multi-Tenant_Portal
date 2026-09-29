import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import * as taskController from '../controllers/task.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  projectParamSchema,
  updateProjectSchema
} from '../validators/project.validator.js';
import {
  listTasksSchema,
  createTaskSchema
} from '../validators/task.validator.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Individual project operations
router.get('/:projectId', validate(projectParamSchema), projectController.getProject);
router.patch('/:projectId', validate(updateProjectSchema), projectController.updateProject);
router.delete('/:projectId', validate(projectParamSchema), projectController.deleteProject);

// Tasks belonging to this project
router.get('/:projectId/tasks', validate(listTasksSchema), taskController.listProjectTasks);
router.post('/:projectId/tasks', validate(createTaskSchema), taskController.createTask);

export default router;
