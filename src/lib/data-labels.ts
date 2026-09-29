/**
 * Friendly names for an app's tables and columns ("contact_form_messages"
 * reads "Contact form messages"), shared by the Data tab and the privacy
 * tools.
 */
const TABLE_LABELS: Record<string, string> = {
  auth_users: "People who signed up",
};
const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  created_at: "Added",
  updated_at: "Last changed",
  created_by: "Added by",
  email: "Email",
  url: "Link",
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

export function tableLabel(name: string) {
  return TABLE_LABELS[name] ?? words(name);
}

export function columnLabel(name: string) {
  return COLUMN_LABELS[name] ?? words(name).replace(/\bid\b/i, "ID");
}
