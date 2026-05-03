import type { Request, Response, NextFunction } from "express";
import {
  CreateClientSchema,
  ChangeRedirectUrisSchema,
} from "../schemas/client.schema.js";
import * as clientRepo from "../repo/client.repo.js";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import ApiError from "../../utility/api.error.js";

/** Helper: get the authenticated user's ID set by requireAuth */
function getUserId(req: Request): string {
  const id = (req as any).userId as string | undefined;
  if (!id) throw ApiError.unauthorized("Authentication required");
  return id;
}

export async function createClient(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    const parsed = CreateClientSchema.parse(req.body);
    const client_secret = randomBytes(32).toString("hex");
    const ret = await clientRepo.createClient(
      userId,
      await hash(client_secret, 12),
      parsed.name,
      parsed.redirectUris,
      parsed.pkceRequired,
    );
    if (!ret) throw ApiError.internal("Failed to create client");
    res.status(201).json({
      client_id: ret.id,
      client_name: ret.name,
      client_redirect_uris: ret.redirectUris,
      client_pkce_required: ret.pkceRequired,
      client_secret,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeRedirectUris(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    const clientId = req.params.clientId;
    if (!clientId || Array.isArray(clientId))
      throw ApiError.badRequest("Client Id required.");

    const parsed = ChangeRedirectUrisSchema.parse(req.body);
    const ret = await clientRepo.changeRedirectUris(
      clientId,
      userId,
      parsed.urisToAdd,
      parsed.urisToRemove,
    );
    if (!ret) throw ApiError.internal("Failed to update client");
    res.status(200).json({
      client_id: ret.id,
      client_name: ret.name,
      client_redirect_uris: ret.redirectUris,
    });
  } catch (error) {
    next(error);
  }
}

export async function rotateSecret(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    const clientId = req.params.clientId;
    if (!clientId || Array.isArray(clientId))
      throw ApiError.badRequest("Client Id required.");

    const client_secret = randomBytes(32).toString("hex");
    const ret = await clientRepo.rotateSecret(
      clientId,
      userId,
      await hash(client_secret, 12),
    );
    if (!ret) throw ApiError.internal("Failed to rotate secret");
    res.status(201).json({
      client_id: ret.id,
      client_name: ret.name,
      client_secret,
    });
  } catch (error) {
    next(error);
  }
}
