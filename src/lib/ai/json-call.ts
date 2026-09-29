import { z } from "zod";
import { providerComplete } from "./provider";
import { extractJson } from "./text";
import { UnusableOutputError } from "./errors";

/**
 * JSON call with validation and one repair attempt. Small models often get
 * a field wrong the first time and fix it when told exactly what's wrong.
 */
export async function completeJson<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  phase: string,
  opts: Parameters<typeof providerComplete>[0],
): Promise<T> {
  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await providerComplete(attempt === 0 ? opts : {
      ...opts,
      userMessage: `${opts.userMessage}\n\nYour previous reply could not be used: ${problem}. Reply again with ONLY the corrected JSON.`,
    });
    let data: unknown;
    try {
      data = JSON.parse(extractJson(text));
    } catch {
      problem = "it was not valid JSON";
      console.error(`[ai] ${phase}: invalid JSON (attempt ${attempt + 1})`, text.slice(0, 300));
      continue;
    }
    const parsed = schema.safeParse(data);
    if (parsed.success) return parsed.data;
    problem = parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    console.error(`[ai] ${phase}: schema mismatch (attempt ${attempt + 1})`, problem);
  }
  throw new UnusableOutputError(`The AI returned an unreadable answer for the ${phase} step. Please try again.`);
}
