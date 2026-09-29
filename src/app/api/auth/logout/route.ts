import { destroySession } from "@/lib/auth";
import { NextResponse } from "next/server";

// Relative, so people stay on the domain they're using (a reseller's own
// domain included) instead of being sent to the platform's address.
const home = () => new NextResponse(null, { status: 303, headers: { Location: "/" } });

export async function POST(req: Request) {
  await destroySession();
  // A plain form post goes home; scripts get JSON.
  return (req.headers.get("content-type") ?? "").includes("form") ? home() : NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  // Only a click on this site signs out. Another site can't sign people out
  // by pointing an <img> at this address (browsers mark that cross-site).
  const site = req.headers.get("sec-fetch-site");
  if (!site || site === "same-origin" || site === "none") await destroySession();
  return home();
}
