import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import { sessionOptions } from "./config/session.config.js";
import wellKnownRouter from "./well-known/routes/wellKnown.routes.js";
import authRouter from "./auth/routes/auth.routes.js";
import oauthRouter from "./oauth/routes/oauth.routes.js";
import clientRouter from "./client/routes/client.routes.js";
import accountRouter from "./account/routes/account.routes.js";
import { errorMiddleware } from "./utility/error.middleware.js";
import { rateLimit } from "./utility/rate-limit.middleware.js";
import ApiError from "./utility/api.error.js";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1); // only for vercel
app.use(session(sessionOptions));
app.use(
  ["/authorize/login", "/authorize/signup", "/token", "/refresh"],
  rateLimit({ windowMs: 60_000, max: 20 }),
);
app.set("trust proxy", true);

// --- Static landing page ---
app.get("/", (req, res) => res.redirect("/dashboard"));
app.use(express.static("public"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(wellKnownRouter);
app.use(authRouter);
app.use(oauthRouter);
app.use(accountRouter);
app.use(clientRouter);

app.use((_req, _res, next) => {
  next(ApiError.notFound("Route not found"));
});

app.use(errorMiddleware);
export default app;
