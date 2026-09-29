import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const slugSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

/**
 * A new app's slug: its name plus a short random suffix. Only letters,
 * digits and single hyphens, at most 47 characters, so it also works as a
 * DNS name for the app's own address.
 */
export function projectSlug(name: string): string {
  const base = slugify(name).slice(0, 40).replace(/-+$/, "") || "app";
  return `${base}-${slugSuffix()}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
