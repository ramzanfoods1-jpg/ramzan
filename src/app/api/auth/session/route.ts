import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const { idToken } = (await req.json()) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS,
    });
    const c = await cookies();
    c.set(SESSION_COOKIE, sessionCookie, {
      maxAge: FIVE_DAYS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
