import app from "./index";

export default {
  port: process.env.PORT ? Number(process.env.PORT) : 5000,
  fetch: app.fetch,
};
