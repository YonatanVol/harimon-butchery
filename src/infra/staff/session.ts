import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type Capability, can, type StaffRole } from "@/domain/auth/permissions";
import { db } from "../db/client";
import { staffUser } from "../db/schema";

const COOKIE = "hr_staff";
const SHIFT_SECONDS = 12 * 60 * 60;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars). See .env.example.");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function startStaffSession(staffId: string) {
  const payload = Buffer.from(JSON.stringify({ sid: staffId, exp: Math.floor(Date.now() / 1000) + SHIFT_SECONDS })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SHIFT_SECONDS,
  });
}

export async function endStaffSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentStaff() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let parsed: { sid: string; exp: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (parsed.exp < Date.now() / 1000) return null;
  const [member] = await db.select().from(staffUser).where(eq(staffUser.id, parsed.sid));
  return member?.active ? member : null;
}

/** For staff pages: the signed-in member, or a redirect to the login screen. */
export async function requireStaff(locale: string, capability?: Capability) {
  const member = await currentStaff();
  if (!member) redirect(`/${locale}/staff/login`);
  if (capability && !can(member.role as StaffRole, capability)) redirect(`/${locale}/staff?denied=${capability}`);
  return member;
}
