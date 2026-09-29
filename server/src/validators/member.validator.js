import { z } from 'zod';
import mongoose from 'mongoose';
import { ROLES } from '../models/Membership.js';

const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId format'
});

export const addMemberSchema = {
  params: z.object({
    organizationId: objectIdSchema
  }),
  body: z.object({
    email: z
      .string({ required_error: 'User email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    role: z.enum([ROLES.ADMIN, ROLES.MEMBER]).default(ROLES.MEMBER)
  }).strict()
};

export const updateMemberRoleSchema = {
  params: z.object({
    organizationId: objectIdSchema,
    userId: objectIdSchema
  }),
  body: z.object({
    role: z.enum([ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER], {
      required_error: 'Role is required'
    })
  }).strict()
};

export const removeMemberSchema = {
  params: z.object({
    organizationId: objectIdSchema,
    userId: objectIdSchema
  })
};
