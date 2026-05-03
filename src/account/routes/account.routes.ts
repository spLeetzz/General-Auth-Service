import { Router } from "express";
import { requireAuth } from "../../utility/require-auth.middleware.js";
import * as accountController from "../controller/account.controller.js";

const router = Router();

router.use("/api/me", requireAuth);

router.get("/api/me", accountController.getMe);
router.patch("/api/me/email", accountController.updateEmail);
router.patch("/api/me/password", accountController.updatePassword);
router.get("/api/me/clients", accountController.getMyClients);

export default router;
