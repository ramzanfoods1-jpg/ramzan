import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  unitPrice: z.number().positive().optional(),
  packetsPerBox: z.number().int().positive().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const snap = await collections.products.doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: snap.id, ...snap.data() });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const ref = collections.products.doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.description != null) updates.description = data.description;
    if (data.unitPrice != null) updates.unitPrice = data.unitPrice;
    if (data.packetsPerBox !== undefined) updates.packetsPerBox = data.packetsPerBox;
    await ref.update(updates);
    const updated = await ref.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await collections.products.doc(id).delete();
  return NextResponse.json({ ok: true });
}
