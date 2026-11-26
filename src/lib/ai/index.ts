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

/** Anthropic's own explanation of a refused request, without anything that looks like a key. */
function reason(error: unknown): string | undefined {
  if (!(error instanceof Anthropic.APIError)) return undefined;
  const body = error.error as { error?: { message?: unknown } } | undefined;
  const text = typeof body?.error?.message === "string" ? body.error.message : error.message;
  return text.replace(/sk-ant-[\w-]+/g, "[key]").slice(0, 300);
}

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
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 50_000, maxRetries: 0 });
  try {
    const response = await client.messages.parse(
      {
        model: env.AI_MODEL,
        max_tokens: room.maxTokens ?? 8000,
        output_config: { effort: env.AI_EFFORT, format: zodOutputFormat(shape) },
        system,
        messages: [{ role: "user", content: user }],
      },
      { timeout: room.timeout ?? 50_000 },
    );
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    return response.parsed_output ?? null;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn("ai: rate limited");
    else if (error instanceof Anthropic.APIError)
      console.warn(`ai: ${error.status} ${reason(error)}`);
    else console.warn("ai: failed");
    return null;
  }
}

export type AiCheck =
  | "off"
  | "noKey"
  | "ok"
  | "badKey"
  | "noCredit"
  | "denied"
  | "noModel"
  | "busy"
  | "unreachable"
  | "failed";

/**
 * A tiny real request, so the Owner can see why AI feedback is or is not working without
 * reading server logs. Says what is wrong in one word; never returns the key or the reply.
 */
export async function checkAi(): Promise<{
  result: AiCheck;
  status?: number;
  model: string;
  detail?: string;
}> {
  const env = serverEnv();
  const model = env.AI_MODEL;
  if (!env.AI_ENABLED) return { result: "off", model };
  if (!env.ANTHROPIC_API_KEY) return { result: "noKey", model };
  const probe = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 0 });
  try {
    await probe.messages.create({
      model,
      max_tokens: 512,
      output_config: { effort: env.AI_EFFORT },
      messages: [{ role: "user", content: "Reply with the word ready." }],
    });
    return { result: "ok", model };
  } catch (error) {
    const detail = reason(error);
    console.warn(
      `ai check: ${error instanceof Anthropic.APIError ? error.status : "no reply"} ${detail ?? ""}`,
    );
    if (error instanceof Anthropic.AuthenticationError)
      return { result: "badKey", status: 401, model, detail };
    if (error instanceof Anthropic.PermissionDeniedError)
      return { result: "denied", status: 403, model, detail };
    if (error instanceof Anthropic.NotFoundError)
      return { result: "noModel", status: 404, model, detail };
    if (error instanceof Anthropic.RateLimitError)
      return { result: "busy", status: 429, model, detail };
    if (error instanceof Anthropic.BadRequestError)
      return {
        result: /credit|billing|balance/i.test(error.message) ? "noCredit" : "failed",
        status: 400,
        model,
        detail,
      };
    if (error instanceof Anthropic.APIConnectionError)
      return { result: "unreachable", model, detail };
    if (error instanceof Anthropic.APIError)
      return {
        result: error.status >= 500 ? "busy" : "failed",
        status: error.status,
        model,
        detail,
      };
    return { result: "failed", model, detail };
  }
}
