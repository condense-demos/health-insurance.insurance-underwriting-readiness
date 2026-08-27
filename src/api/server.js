import Fastify from "fastify";
import { registerRoutes } from "./routes.js";

export async function createServer(deps) {
  const app =
    Fastify({
      logger: false
    });

  app.addHook(
    "onRequest",
    async (request, reply) => {
      reply.header(
        "Access-Control-Allow-Origin",
        deps.corsOrigin || "*"
      );

      reply.header(
        "Access-Control-Allow-Headers",
        "Content-Type"
      );

      reply.header(
        "Access-Control-Allow-Methods",
        "GET,POST,OPTIONS"
      );

      if (
        request.method === "OPTIONS"
      ) {
        return reply
          .code(204)
          .send();
      }
    }
  );

  registerRoutes(
    app,
    deps
  );

  return app;
}
