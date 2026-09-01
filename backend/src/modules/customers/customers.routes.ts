import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './customers.controller';

export const customerRoutes = Router();

customerRoutes.use(authenticate);

customerRoutes.get('/', controller.list);
customerRoutes.get('/:id', controller.detail);
customerRoutes.get('/:id/notes', controller.notes);

customerRoutes.post('/', authorize('ADMIN', 'SALES'), controller.create);
customerRoutes.patch('/:id', authorize('ADMIN', 'SALES'), controller.update);
customerRoutes.post('/:id/notes', authorize('ADMIN', 'SALES'), controller.addNote);
