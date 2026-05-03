import "./config/env.validate.js"; // validate env
import app from "./server.js";
import { initKeyCache } from "./keys/key.service.js";

await initKeyCache();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
