import type { Request, Response } from "express";
import { buildDiscoveryDocument } from "../services/discovery.service.js";
import { getPublicJwks } from "../../keys/key.service.js";

function issuerFromRequest(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

export function getOpenIdConfiguration(req: Request, res: Response) {
  res.json(buildDiscoveryDocument(issuerFromRequest(req)));
}

export function getJwks(_req: Request, res: Response) {
  res.json(getPublicJwks());
}

