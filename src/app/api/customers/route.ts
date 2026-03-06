import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await collections.customers.orderBy("name", "asc").get();
  const invoicesSnap = await collections.invoices.get();
  const countByCustomer: Record<string, number> = {};
  invoicesSnap.docs.forEach((d) => {
    const cid = d.data().customerId;
    countByCustomer[cid] = (countByCustomer[cid] ?? 0) + 1;
  });
  const customers = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      _count: { invoices: countByCustomer[doc.id] ?? 0 },
    };
  });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const ref = collections.customers.doc();
    const now = new Date().toISOString();
    await ref.set({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      customerId: data.customerId ?? null,
      defaultTerms: data.defaultTerms ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({
      id: ref.id,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      customerId: data.customerId ?? null,
      defaultTerms: data.defaultTerms ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
