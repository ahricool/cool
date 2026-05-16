import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { closePool, migrate } from "./db.js";
import { registerRoutes } from "./routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await registerRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      message: statusCode >= 500 ? "Internal server error" : error.message,
    });
  });

  app.addHook("onClose", async () => {
    await closePool();
  });

  return app;
}

async function start() {
  if (config.autoMigrate) {
    await migrate();
  }

  const app = await buildApp();
  await app.listen({ port: config.port, host: config.host });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
