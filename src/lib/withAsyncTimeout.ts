/**
 * Races `promise` against a timer so hung Edge / fetch calls cannot leave UI spinners forever.
 */
export async function withAsyncTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    id = globalThis.setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${Math.round(ms / 1000)}s. Check Supabase Edge function deploy, ` +
            `network, and server secrets (XAI_API_KEY / GROK_API_KEY for parse-companion-prompt + design lab; TOGETHER_API_KEY for generate-image).`,
        ),
      );
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (id !== undefined) globalThis.clearTimeout(id);
  }
}
