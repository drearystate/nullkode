/**
 * Optional outside timer for scheduled flows. The app runs its own scheduler
 * every minute, so most installs don't need this. Use it when the app is
 * started with NK_EXTERNAL_SCHEDULER=1 (for example to keep the timer in one
 * place when several app copies run). Running both is safe: the database
 * lets each due run be claimed only once.
 *
 *   CRON_SECRET=… NK_CRON_URL=http://127.0.0.1:3001/api/cron node scripts/scheduler.mjs
 *
 * The secret is sent only in the Authorization header.
 */
const secret = process.env.CRON_SECRET;
const url = process.env.NK_CRON_URL || 'http://app:3001/api/cron';
let warnedAuth = false;

async function tick() {
  try {
    const response = await fetch(url, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55_000) });
    if (response.status === 401) {
      if (!warnedAuth) console.error('The app refused the scheduler secret. Make sure CRON_SECRET is the same for the app and this scheduler.');
      warnedAuth = true;
    } else if (!response.ok) {
      console.error(`Scheduled workflow check failed (${response.status}). It will retry next minute.`);
    } else {
      warnedAuth = false;
    }
  } catch {
    console.error('Scheduled workflow check could not reach the app. It will retry next minute.');
  }
  setTimeout(tick, 60_000);
}

if (!secret) {
  // Don't crash-loop: the app's built-in scheduler still runs scheduled flows.
  console.error('CRON_SECRET is not set, so this outside scheduler is idle. The app runs scheduled flows by itself unless NK_EXTERNAL_SCHEDULER=1.');
  setInterval(() => {}, 60 * 60_000);
} else {
  void tick();
}
