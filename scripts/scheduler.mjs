const secret = process.env.CRON_SECRET;
if (!secret) throw new Error('CRON_SECRET is missing. Run the installer or configure it in .env.');
async function tick() {
  try {
    const response = await fetch('http://app:3001/api/cron', { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55_000) });
    if (!response.ok && response.status !== 409) console.error(`Scheduled workflow check failed (${response.status}).`);
  } catch (error) { console.error('Scheduled workflow check could not reach the app. It will retry next minute.'); }
  setTimeout(tick, 60_000);
}
void tick();
