import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId format'
});

export const createOrgSchema = {
  body: z.object({
    name: z
      .string({ required_error: 'Organization name is required' })
      .trim()
      .min(2, 'Organization name must be at least 2 characters')
      .max(80, 'Organization name cannot exceed 80 characters')
  }).strict()
};

export const orgParamSchema = {
  params: z.object({
    organizationId: objectIdSchema
  })
};
