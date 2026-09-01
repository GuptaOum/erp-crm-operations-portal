import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './challans.controller';

export const challanRoutes = Router();

challanRoutes.use(authenticate);

challanRoutes.get('/', controller.list);
challanRoutes.get('/:id', controller.detail);

challanRoutes.post('/', authorize('ADMIN', 'SALES'), controller.create);
challanRoutes.post('/:id/confirm', authorize('ADMIN', 'SALES', 'WAREHOUSE'), controller.confirm);
challanRoutes.post('/:id/cancel', authorize('ADMIN', 'SALES'), controller.cancel);
