import { z } from 'zod';
import mongoose from 'mongoose';
import { TASK_STATUS, TASK_PRIORITY } from '../models/Task.js';

const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId format'
});

const optionalObjectIdSchema = z
  .string()
  .refine((val) => mongoose.isValidObjectId(val), {
    message: 'Invalid ObjectId format'
  })
  .nullable()
  .optional();

export const listTasksSchema = {
  params: z.object({
    projectId: objectIdSchema
  }),
  query: z.object({
    status: z.nativeEnum(TASK_STATUS).optional(),
    priority: z.nativeEnum(TASK_PRIORITY).optional(),
    assignee: z.string().optional(),
    search: z.string().optional(),
    sort: z.string().optional()
  })
};

export const createTaskSchema = {
  params: z.object({
    projectId: objectIdSchema
  }),
  body: z.object({
    title: z
      .string({ required_error: 'Task title is required' })
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .default(''),
    status: z.nativeEnum(TASK_STATUS).default(TASK_STATUS.TODO),
    priority: z.nativeEnum(TASK_PRIORITY).default(TASK_PRIORITY.MEDIUM),
    assignee: optionalObjectIdSchema,
    dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    label: z.string().trim().max(50, 'Label cannot exceed 50 characters').default('')
  }).strict()
};

export const taskParamSchema = {
  params: z.object({
    taskId: objectIdSchema
  })
};

export const updateTaskSchema = {
  params: z.object({
    taskId: objectIdSchema
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(150, 'Title cannot exceed 150 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    status: z.nativeEnum(TASK_STATUS).optional(),
    priority: z.nativeEnum(TASK_PRIORITY).optional(),
    assignee: optionalObjectIdSchema,
    dueDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    label: z.string().trim().max(50, 'Label cannot exceed 50 characters').optional()
  }).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update'
  })
};
