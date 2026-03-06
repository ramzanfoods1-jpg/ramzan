import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase";
import { collections } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  salespersonCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, salespersonCode } = bodySchema.parse(body);
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name ?? undefined,
    });
    const uid = userRecord.uid;
    await collections.users.doc(uid).set({
      email,
      name: name ?? null,
      salespersonCode: salespersonCode ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({
      id: uid,
      email: userRecord.email,
      name: name ?? null,
      salespersonCode: salespersonCode ?? null,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const err = e as { code?: string };
    if (err?.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
