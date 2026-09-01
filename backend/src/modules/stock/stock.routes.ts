import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './stock.controller';

export const stockRoutes = Router();

stockRoutes.use(authenticate);
stockRoutes.get('/', authorize('ADMIN', 'WAREHOUSE'), controller.list);
