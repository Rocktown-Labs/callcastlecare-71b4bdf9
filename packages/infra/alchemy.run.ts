import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

const mediaBucket = Cloudflare.R2.Bucket("media", {
  cors: [
    {
      allowedHeaders: ["content-type"],
      allowedMethods: ["GET", "PUT"],
      allowedOrigins: ["*"],
    },
  ],
});

const jobQueue = Cloudflare.Queues.Queue("jobs");

export const server = Cloudflare.Worker("castlecare-server", {
  compatibility: {
    flags: ["nodejs_compat"],
  },
  dev: {
    port: 3000,
  },
  env: {
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: Cloudflare.Worker.URL,
    CORS_ORIGIN: Config.String("CORS_ORIGIN"),
    DATABASE_URL: Config.Redacted("DATABASE_URL"),
    GOOGLE_CLIENT_ID: Config.String("GOOGLE_CLIENT_ID").pipe(
      Config.withDefault("")
    ),
    GOOGLE_CLIENT_SECRET: Config.String("GOOGLE_CLIENT_SECRET").pipe(
      Config.withDefault("")
    ),
    LOG_LEVEL: Config.String("LOG_LEVEL").pipe(Config.withDefault("info")),
    MEDIA_BUCKET: mediaBucket,
    NODE_ENV: Config.String("NODE_ENV").pipe(Config.withDefault("production")),
    PLATFORM_FEE_BPS: Config.String("PLATFORM_FEE_BPS").pipe(
      Config.withDefault("0")
    ),
    PROVIDER_PAYOUT_BPS: Config.String("PROVIDER_PAYOUT_BPS").pipe(
      Config.withDefault("6000")
    ),
    QUEUE: jobQueue,
    RADAR_API_KEY: Config.String("RADAR_API_KEY").pipe(Config.withDefault("")),
    RAPIDAPI_KEY: Config.String("RAPIDAPI_KEY").pipe(Config.withDefault("")),
    RAPIDAPI_ZILLOW_HOST: Config.String("RAPIDAPI_ZILLOW_HOST").pipe(
      Config.withDefault("")
    ),
    RENTCAST_API_KEY: Config.String("RENTCAST_API_KEY").pipe(
      Config.withDefault("")
    ),
    RESEND_API_KEY: Config.String("RESEND_API_KEY").pipe(
      Config.withDefault("")
    ),
    RESEND_WEBHOOK_SECRET: Config.String("RESEND_WEBHOOK_SECRET").pipe(
      Config.withDefault("")
    ),
    STRIPE_BILLING_WEBHOOK_SECRET: Config.String(
      "STRIPE_BILLING_WEBHOOK_SECRET"
    ).pipe(Config.withDefault("")),
    STRIPE_COMMERCE_WEBHOOK_SECRET: Config.String(
      "STRIPE_COMMERCE_WEBHOOK_SECRET"
    ).pipe(Config.withDefault("")),
    STRIPE_CONNECT_WEBHOOK_SECRET: Config.String(
      "STRIPE_CONNECT_WEBHOOK_SECRET"
    ).pipe(Config.withDefault("")),
    STRIPE_PRICE_BASIC_MONTHLY: Config.String(
      "STRIPE_PRICE_BASIC_MONTHLY"
    ).pipe(Config.withDefault("")),
    STRIPE_PUBLISHABLE_KEY: Config.String("STRIPE_PUBLISHABLE_KEY").pipe(
      Config.withDefault("")
    ),
    STRIPE_SECRET_KEY: Config.String("STRIPE_SECRET_KEY").pipe(
      Config.withDefault("")
    ),
    STRIPE_WEBHOOK_PUBLIC_URL: Config.String("STRIPE_WEBHOOK_PUBLIC_URL").pipe(
      Config.withDefault("")
    ),
    STRIPE_WEBHOOK_SECRET: Config.String("STRIPE_WEBHOOK_SECRET").pipe(
      Config.withDefault("")
    ),
  },
  main: "../../apps/server/src/worker.ts",
  name: "castlecare-server",
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
  "callcastlecare",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* callcastlecare() {
    const serverWorker = yield* server;
    const webWorker = yield* Cloudflare.Website.Vite("web", {
      compatibility: {
        flags: ["nodejs_compat"],
      },
      dev: {
        port: 3001,
      },
      env: {
        VITE_SERVER_URL: serverWorker.url.as<string>(),
      },
      name: "castlecare-web",
      rootDir: "../../apps/web",
    });

    return {
      serverUrl: serverWorker.url,
      webUrl: webWorker.url,
    };
  })
);
