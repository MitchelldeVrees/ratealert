import crypto from "crypto";

export function getEmailDomain(email) {
  if (!email || typeof email !== "string") return "unknown";
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return "unknown";
  return email.slice(at + 1).toLowerCase();
}

export function hashEmail(email) {
  if (!email || typeof email !== "string") return "";
  const normalized = email.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 8);
}

export function makeTraceId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}
