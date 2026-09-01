import { Request, Response } from 'express';
import { listMovementsSchema } from './stock.schema';
import * as stockService from './stock.service';

export async function list(req: Request, res: Response) {
  const query = listMovementsSchema.parse(req.query);
  const result = await stockService.listMovements(query);
  res.json(result);
}
