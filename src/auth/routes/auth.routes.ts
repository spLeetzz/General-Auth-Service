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
router.get("/authorize/google/init", googleController.googleInit);
router.get("/authorize/google/exchange", googleController.googleExchange);

if (process.env.GOOGLE_REDIRECT_URI) {
  const googleCallbackPath = new URL(process.env.GOOGLE_REDIRECT_URI).pathname;
  // Map the callback path directly to exchange so local testing works
  router.get(googleCallbackPath, googleController.googleExchange);
}

import { renderSuccessPage } from "../views/auth-page.service.js";
router.get("/auth/success", (req, res) => {
  res.type("html").send(renderSuccessPage());
});

export default router;
