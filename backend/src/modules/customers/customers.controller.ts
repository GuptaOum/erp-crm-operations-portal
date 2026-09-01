import { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate';
import { parseId } from '../../utils/identifier';
import {
  createCustomerSchema,
  createNoteSchema,
  listCustomersSchema,
  listFollowUpsSchema,
  updateCustomerSchema,
} from './customers.schema';
import * as customerService from './customers.service';

export async function list(req: Request, res: Response) {
  const query = listCustomersSchema.parse(req.query);
  const result = await customerService.listCustomers(query);
  res.json(result);
}

export async function followUps(req: Request, res: Response) {
  const query = listFollowUpsSchema.parse(req.query);
  const result = await customerService.listFollowUps(query);
  res.json(result);
}

export async function detail(req: Request, res: Response) {
  const customer = await customerService.getCustomer(parseId(req.params.id));
  res.json(customer);
}

export async function create(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(input, currentUser(req).id);
  res.status(201).json(customer);
}

export async function update(req: Request, res: Response) {
  const input = updateCustomerSchema.parse(req.body);
  const customer = await customerService.updateCustomer(parseId(req.params.id), input);
  res.json(customer);
}

export async function notes(req: Request, res: Response) {
  const data = await customerService.listNotes(parseId(req.params.id));
  res.json({ data });
}

export async function addNote(req: Request, res: Response) {
  const input = createNoteSchema.parse(req.body);
  const note = await customerService.addNote(parseId(req.params.id), input, currentUser(req).id);
  res.status(201).json(note);
}
