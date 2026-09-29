import { db } from "./db";

/**
 * How new people get on: of everyone who signed up in the last `days`
 * days, how many made an app, how many published one, and how long the
 * typical person took from signing up to a published app. This is the
 * number behind any "easy to use" claim, so it's measured, not guessed.
 *
 * `arrivedWithIdea` counts the sign-ups that started from the home page's
 * "What should your app do?" box (User.prefs.arrivedWithIdea, set at sign-up).
 */
export type Funnel = {
  days: number;
  signups: number;
  madeApp: number;
  published: number;
  medianMinutesToPublish: number | null;
  arrivedWithIdea: number;
};

export async function onboardingFunnel(days = 30): Promise<Funnel> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const users = await db.user.findMany({
    where: { createdAt: { gte: since }, role: "USER" },
    select: { createdAt: true, prefs: true, projects: { select: { createdAt: true, publishedAt: true } } },
    take: 20_000,
  });
  const minutes: number[] = [];
  let madeApp = 0;
  let published = 0;
  let arrivedWithIdea = 0;
  for (const u of users) {
    if ((u.prefs as { arrivedWithIdea?: unknown } | null)?.arrivedWithIdea === true) arrivedWithIdea++;
    if (u.projects.length) madeApp++;
    const firstPublish = u.projects.map((p) => p.publishedAt?.getTime()).filter((t): t is number => typeof t === "number").sort((a, b) => a - b)[0];
    if (firstPublish !== undefined) {
      published++;
      minutes.push(Math.max(0, (firstPublish - u.createdAt.getTime()) / 60_000));
    }
  }
  minutes.sort((a, b) => a - b);
  const mid = minutes.length ? (minutes.length % 2 ? minutes[(minutes.length - 1) / 2] : (minutes[minutes.length / 2 - 1] + minutes[minutes.length / 2]) / 2) : null;
  return { days, signups: users.length, madeApp, published, medianMinutesToPublish: mid === null ? null : Math.round(mid), arrivedWithIdea };
}
