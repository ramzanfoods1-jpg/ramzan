import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  description: z.string().min(1),
  unitPrice: z.number().positive(),
  packetsPerBox: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await collections.products.orderBy("description", "asc").get();
  const products = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const ref = collections.products.doc();
    const now = new Date().toISOString();
    await ref.set({
      description: data.description,
      unitPrice: data.unitPrice,
      packetsPerBox: data.packetsPerBox ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({
      id: ref.id,
      description: data.description,
      unitPrice: data.unitPrice,
      packetsPerBox: data.packetsPerBox ?? null,
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
