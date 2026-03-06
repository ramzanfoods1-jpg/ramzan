import { cookies } from "next/headers";
import { adminAuth } from "./firebase";
import { collections } from "./db";

const SESSION_COOKIE = "session";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  salespersonCode: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const c = await cookies();
  const sessionCookie = c.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const userSnap = await collections.users.doc(uid).get();
    const data = userSnap.data();
    return {
      id: uid,
      email: decoded.email ?? null,
      name: data?.name ?? null,
      salespersonCode: data?.salespersonCode ?? null,
    };
  } catch {
    return null;
  }
}
