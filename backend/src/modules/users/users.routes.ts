import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './users.controller';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.use(authorize('ADMIN'));

userRoutes.get('/', controller.list);
userRoutes.post('/', controller.create);
userRoutes.patch('/:id', controller.update);
userRoutes.post('/:id/password', controller.resetPassword);
