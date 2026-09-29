import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId format'
});

export const listProjectsSchema = {
  params: z.object({
    organizationId: objectIdSchema
  }),
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};

export const createProjectSchema = {
  params: z.object({
    organizationId: objectIdSchema
  }),
  body: z.object({
    name: z
      .string({ required_error: 'Project name is required' })
      .trim()
      .min(2, 'Project name must be at least 2 characters')
      .max(100, 'Project name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .default('')
  }).strict() // Strips or rejects any forbidden fields like organization or createdBy
};

export const projectParamSchema = {
  params: z.object({
    projectId: objectIdSchema
  })
};

export const updateProjectSchema = {
  params: z.object({
    projectId: objectIdSchema
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Project name must be at least 2 characters')
      .max(100, 'Project name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
  }).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update'
  })
};
