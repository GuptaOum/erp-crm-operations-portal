import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './customers.controller';

export const customerRoutes = Router();

customerRoutes.use(authenticate);

customerRoutes.get('/', authorize('ADMIN', 'SALES', 'ACCOUNTS'), controller.list);
customerRoutes.get('/:id', authorize('ADMIN', 'SALES', 'ACCOUNTS'), controller.detail);
customerRoutes.get('/:id/notes', authorize('ADMIN', 'SALES', 'ACCOUNTS'), controller.notes);

customerRoutes.post('/', authorize('ADMIN', 'SALES'), controller.create);
customerRoutes.patch('/:id', authorize('ADMIN', 'SALES'), controller.update);
customerRoutes.post('/:id/notes', authorize('ADMIN', 'SALES'), controller.addNote);
