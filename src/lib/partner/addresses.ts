/** Where the partner API answers: on this server itself, and on the public address. */
export function partnerApiAddresses(): { localUrl: string; publicUrl: string } {
  const local = (process.env.NK_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || "3001"}`).replace(/\/$/, "");
  const pub = (process.env.PUBLIC_BASE_URL || local).replace(/\/$/, "");
  return { localUrl: `${local}/api/partner/v1`, publicUrl: `${pub}/api/partner/v1` };
}
