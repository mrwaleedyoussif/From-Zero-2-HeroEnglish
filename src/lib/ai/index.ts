import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { serverEnv } from "@/lib/env";

/** Whether AI feedback is switched on and has a key. */
export function aiReady(): boolean {
  const env = serverEnv();
  return env.AI_ENABLED && !!env.ANTHROPIC_API_KEY;
}

/** Whether the AI reader may also draw word pictures (a separate switch: it costs extra). */
export const aiPictures = () => aiReady() && serverEnv().AI_PICTURES;

let client: Anthropic | undefined;

/**
 * Ask the model for an answer in a fixed shape. Returns null when AI is off or anything goes
 * wrong (no key, a slow or failed request, a refusal, an answer in the wrong shape): callers
 * always have a rules-only fallback, so a learner is never left waiting on this service.
 */
export async function askAi<T extends z.ZodType>(
  shape: T,
  system: string,
  user: string,
  /** Longer answers (drawings) may take more time and room than the defaults. */
  room: { timeout?: number; maxTokens?: number } = {},
): Promise<z.infer<T> | null> {
  if (!aiReady()) return null;
  const env = serverEnv();
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 1 });
  try {
    const response = await client.messages.parse(
      {
        model: env.AI_MODEL,
        max_tokens: room.maxTokens ?? 8000,
        output_config: { effort: "low", format: zodOutputFormat(shape) },
        system,
        messages: [{ role: "user", content: user }],
      },
      { timeout: room.timeout ?? 40_000 },
    );
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    return response.parsed_output ?? null;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn("ai: rate limited");
    else if (error instanceof Anthropic.APIError) console.warn(`ai: ${error.status}`);
    else console.warn("ai: failed");
    return null;
  }
}
