import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type Capability, can, type StaffRole } from "@/domain/auth/permissions";
import { openSession, sealSession } from "../auth/signed";
import { db } from "../db/client";
import { staffUser } from "../db/schema";

const COOKIE = "hr_staff";
const SHIFT_SECONDS = 12 * 60 * 60;

export async function startStaffSession(staffId: string) {
  (await cookies()).set(COOKIE, sealSession({ sid: staffId }, SHIFT_SECONDS), {
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
  const session = openSession<{ sid: string }>((await cookies()).get(COOKIE)?.value);
  if (!session || typeof session.sid !== "string") return null;
  const [member] = await db.select().from(staffUser).where(eq(staffUser.id, session.sid));
  return member?.active ? member : null;
}

/** For staff pages: the signed-in member, or a redirect to the login screen. */
export async function requireStaff(locale: string, capability?: Capability) {
  const member = await currentStaff();
  if (!member) redirect(`/${locale}/staff/login`);
  if (capability && !can(member.role as StaffRole, capability)) redirect(`/${locale}/staff?denied=${capability}`);
  return member;
}
