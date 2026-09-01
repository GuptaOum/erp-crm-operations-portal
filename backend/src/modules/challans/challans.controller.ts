import { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate';
import { parseId } from '../../utils/identifier';
import { createChallanSchema, listChallansSchema } from './challans.schema';
import * as challanService from './challans.service';

export async function list(req: Request, res: Response) {
  const query = listChallansSchema.parse(req.query);
  const result = await challanService.listChallans(query);
  res.json(result);
}

export async function detail(req: Request, res: Response) {
  const challan = await challanService.getChallan(parseId(req.params.id));
  res.json(challan);
}

export async function create(req: Request, res: Response) {
  const input = createChallanSchema.parse(req.body);
  const challan = await challanService.createChallan(input, currentUser(req).id);
  res.status(201).json(challan);
}

export async function confirm(req: Request, res: Response) {
  const challan = await challanService.confirmChallan(parseId(req.params.id), currentUser(req).id);
  res.json(challan);
}

export async function cancel(req: Request, res: Response) {
  const challan = await challanService.cancelChallan(parseId(req.params.id), currentUser(req).id);
  res.json(challan);
}

