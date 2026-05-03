import { Router } from "express";
import * as oauthController from "../controller/oauth.controller.js";

const router = Router();

router.get("/authorize", oauthController.authorize);
router.post("/token", oauthController.token);
router.post("/refresh", oauthController.refresh);
router.post("/introspect", oauthController.introspect);
router.post("/revoke", oauthController.revoke);
router.get("/userinfo", oauthController.userinfo);

export default router;

