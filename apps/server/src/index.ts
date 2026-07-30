import { app } from "./app";

export { app as default, app, type ApiType, type AppType } from "./app";

const startLocalServer = async () => {
  if (!process.env.VERCEL) {
    const pkgName = "@hono/node-server";
    const { serve } = await import(pkgName);
    serve(
      {
        fetch: app.fetch,
        port: 3000,
      },
      (info) => {
        console.log(`Server is running on http://localhost:${info.port}`);
      }
    );
  }
};

void startLocalServer();
