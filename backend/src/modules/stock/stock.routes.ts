import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './stock.controller';

export const stockRoutes = Router();

stockRoutes.use(authenticate);
stockRoutes.get('/', controller.list);
