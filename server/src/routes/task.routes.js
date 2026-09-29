import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { taskParamSchema, updateTaskSchema } from '../validators/task.validator.js';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.patch('/:taskId', validate(updateTaskSchema), taskController.updateTask);
router.delete('/:taskId', validate(taskParamSchema), taskController.deleteTask);

export default router;
