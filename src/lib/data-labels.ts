import { enErrors, type ErrT } from "./errors-i18n";

/**
 * Friendly names for an app's tables and columns ("contact_form_messages"
 * reads "Contact form messages"), shared by the Data tab and the privacy
 * tools. Only the display names of the platform's own built-in tables and
 * columns are translated (errors.dataLabels.*, with `t` in the owner's
 * language; English without it); the names the app's own tables and columns
 * were given are its own data and are only tidied up.
 */
const TABLE_LABELS: Record<string, string> = {
  auth_users: "authUsers",
};
const COLUMN_LABELS: Record<string, string> = {
  id: "id",
  created_at: "createdAt",
  updated_at: "updatedAt",
  created_by: "createdBy",
  email: "email",
  url: "url",
};

function words(name: string) {
  const parts = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  // "bookings_bookings" -> "bookings"
  const deduped = parts.filter((w, i) => i === 0 || w !== parts[i - 1]);
  const s = deduped.join(" ");
  return s ? s[0].toUpperCase() + s.slice(1) : name;
}

export function tableLabel(name: string, t: ErrT = enErrors()) {
  const key = Object.hasOwn(TABLE_LABELS, name) ? TABLE_LABELS[name] : null;
  return key ? t(`dataLabels.tables.${key}`) : words(name);
}

export function columnLabel(name: string, t: ErrT = enErrors()) {
  const key = Object.hasOwn(COLUMN_LABELS, name) ? COLUMN_LABELS[name] : null;
  return key ? t(`dataLabels.columns.${key}`) : words(name).replace(/\bid\b/i, "ID");
}
