import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { deleteTeamMember, getTeamMembers, postTeamMember } from './team.controller.js';

export const teamRouter = Router();

teamRouter.use(requireAuth);
// Only business_owner and crm_owner can manage team members
teamRouter.use(requireRole('crm_owner', 'business_owner'));

teamRouter.get('/', getTeamMembers);
teamRouter.post('/', postTeamMember);
teamRouter.delete('/:id', deleteTeamMember);
