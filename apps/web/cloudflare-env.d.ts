export interface CloudflareEnv {
  VITE_SERVER_URL: string;
}

declare global {
  // eslint-disable-next-line no-var
  var Env: CloudflareEnv;
  type Env = CloudflareEnv;
}
