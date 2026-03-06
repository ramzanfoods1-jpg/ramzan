import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { z } from "zod";

const SETTINGS_DOC_ID = "default";

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  bankName: z.string().optional(),
  sortCode: z.string().optional(),
  accountNumber: z.string().optional(),
  chequesPayableTo: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

const defaults = {
  companyName: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: null as string | null,
  bankName: "",
  sortCode: "",
  accountNumber: "",
  chequesPayableTo: "",
  taxRate: 0,
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await collections.companySettings.doc(SETTINGS_DOC_ID).get();
  if (!snap.exists) return NextResponse.json(defaults);
  const data = snap.data()!;
  return NextResponse.json({
    ...defaults,
    ...data,
    id: snap.id,
    taxRate: data.taxRate ?? 0,
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const ref = collections.companySettings.doc(SETTINGS_DOC_ID);
    const existing = await ref.get();
    const existingData = existing.data() ?? {};
    const payload = {
      companyName: data.companyName ?? existingData.companyName ?? "Company",
      tagline: data.tagline ?? existingData.tagline ?? null,
      address: data.address ?? existingData.address ?? null,
      phone: data.phone ?? existingData.phone ?? null,
      email: data.email ?? existingData.email ?? null,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : existingData.logoUrl ?? null,
      bankName: data.bankName ?? existingData.bankName ?? null,
      sortCode: data.sortCode ?? existingData.sortCode ?? null,
      accountNumber: data.accountNumber ?? existingData.accountNumber ?? null,
      chequesPayableTo: data.chequesPayableTo ?? existingData.chequesPayableTo ?? null,
      taxRate: data.taxRate !== undefined ? data.taxRate : (existingData.taxRate ?? 0),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(payload, { merge: true });
    return NextResponse.json({ id: ref.id, ...payload });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
