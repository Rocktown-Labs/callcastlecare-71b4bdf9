import { app } from "./app";

export { app as default, app, type ApiType, type AppType } from "./app";

const startLocalServer = async () => {
  if (!process.env.VERCEL) {
    const { serve } = await import("@hono/node-server");
    serve(
      {
        fetch: app.fetch,
        port: 3000,
      },
      (info: { port: number }) => {
        console.log(`Server is running on http://localhost:${info.port}`);
      }
    );
  }
};

void startLocalServer();
