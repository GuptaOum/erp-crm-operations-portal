import { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate';
import { parseId } from '../../utils/identifier';
import {
  createUserSchema,
  listUsersSchema,
  resetPasswordSchema,
  updateUserSchema,
} from './users.schema';
import * as userService from './users.service';

export async function list(req: Request, res: Response) {
  const query = listUsersSchema.parse(req.query);
  const result = await userService.listUsers(query);
  res.json(result);
}

export async function create(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await userService.createUser(input);
  res.status(201).json(user);
}

export async function update(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  const user = await userService.updateUser(parseId(req.params.id), input, currentUser(req).id);
  res.json(user);
}

export async function resetPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  const user = await userService.resetPassword(parseId(req.params.id), input.password);
  res.json(user);
}
