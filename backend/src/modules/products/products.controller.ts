import { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';
import { parseId } from '../../utils/identifier';
import {
  adjustStockSchema,
  createProductSchema,
  listProductsSchema,
  updateProductSchema,
} from './products.schema';
import * as productService from './products.service';

export async function list(req: Request, res: Response) {
  const query = listProductsSchema.parse(req.query);
  const result = await productService.listProducts(query);
  res.json(result);
}

export async function categories(_req: Request, res: Response) {
  const data = await productService.listCategories();
  res.json({ data });
}

export async function detail(req: Request, res: Response) {
  const product = await productService.getProduct(parseId(req.params.id));
  res.json(product);
}

export async function create(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await productService.createProduct(input, currentUser(req).id);
  res.status(201).json(product);
}

export async function update(req: Request, res: Response) {
  const input = updateProductSchema.parse(req.body);
  const product = await productService.updateProduct(parseId(req.params.id), input);
  res.json(product);
}

export async function adjustStock(req: Request, res: Response) {
  const input = adjustStockSchema.parse(req.body);
  const product = await productService.adjustStock(
    parseId(req.params.id),
    input,
    currentUser(req).id,
  );
  res.json(product);
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, 'An image file is required');
  }

  const product = await productService.saveProductImage(parseId(req.params.id), req.file);
  res.json(product);
}
