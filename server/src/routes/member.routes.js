import { Router } from 'express';
import * as memberController from '../controllers/member.controller.js';
import { validate } from '../middleware/validate.js';
import {
  addMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema
} from '../validators/member.validator.js';

const router = Router({ mergeParams: true });

router.get('/', memberController.listMembers);
router.post('/', validate(addMemberSchema), memberController.addMember);
router.patch('/:userId', validate(updateMemberRoleSchema), memberController.updateMemberRole);
router.delete('/:userId', validate(removeMemberSchema), memberController.removeMember);

export default router;
