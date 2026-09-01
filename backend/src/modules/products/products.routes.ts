import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './products.controller';

export const productRoutes = Router();

productRoutes.use(authenticate);

productRoutes.get('/', controller.list);
productRoutes.get('/categories', controller.categories);
productRoutes.get('/:id', controller.detail);

productRoutes.post('/', authorize('ADMIN', 'WAREHOUSE'), controller.create);
productRoutes.patch('/:id', authorize('ADMIN', 'WAREHOUSE'), controller.update);
productRoutes.post('/:id/stock', authorize('ADMIN', 'WAREHOUSE'), controller.adjustStock);
