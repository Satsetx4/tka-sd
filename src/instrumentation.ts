export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getServerEnv } = await import("./config/server-env");
  getServerEnv();
}
