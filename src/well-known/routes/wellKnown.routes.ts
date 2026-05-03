import { Router } from "express";
import * as controller from "../controller/wellKnown.controller.js";

const router = Router();

router.get("/.well-known/openid-configuration", controller.getOpenIdConfiguration);
router.get("/.well-known/jwks.json", controller.getJwks);

export default router;

