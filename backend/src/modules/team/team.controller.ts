import { Request, Response, NextFunction } from "express";
import { teamService } from "./team.service";
import { createMemberSchema, updateMemberSchema } from "./team.types";

export const teamController = {

  // GET /api/v1/team
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await teamService.list(req.user.tenant_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/team
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createMemberSchema.parse(req.body);
      const member = await teamService.create(req.user.tenant_id, dto);
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/v1/team/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateMemberSchema.parse(req.body);
      const member = await teamService.update(
        req.user.tenant_id,
        req.params.id,
        req.user.sub,
        dto,
      );
      res.json(member);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/team/:id
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await teamService.remove(req.user.tenant_id, req.params.id, req.user.sub);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
