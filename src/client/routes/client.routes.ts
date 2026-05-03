import { Router } from "express";
import { requireAuth } from "../../utility/require-auth.middleware.js";
import * as clientController from "../controller/client.controller.js";

const router = Router();

router.use(requireAuth);
router.post("/api/me/clients", clientController.createClient);
router.put("/api/me/clients/:clientId/redirect-uris", clientController.changeRedirectUris);
router.patch("/api/me/clients/:clientId/rotate-secret", clientController.rotateSecret);

export default router;