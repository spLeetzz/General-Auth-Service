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
if (!process.env.GOOGLE_REDIRECT_URI) {
  throw new Error("GOOGLE_REDIRECT_URI environment variable is required for Google SSO.");
}
const googleCallbackPath = new URL(process.env.GOOGLE_REDIRECT_URI).pathname;

router.get(googleCallbackPath, googleController.googleCallback);
export default router;
