export async function syntheticDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
