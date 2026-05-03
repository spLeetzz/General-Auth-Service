import { Router } from "express";
import * as authController from "../controller/auth.controller.js";
import * as googleController from "../controller/google.controller.js";

const router = Router();

router.get("/authorize/login", authController.loginPageGet);
router.post("/authorize/login", authController.login);
router.get("/authorize/signup", authController.signupPageGet);
router.post("/authorize/signup", authController.signup);
router.post("/authorize/logout", authController.logout);

// Google SSO
router.get("/authorize/google", googleController.googleRedirect);
router.get("/authorize/google/callback", googleController.googleCallback);

export default router;
