import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections, computeInvoiceStatus } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["account", "cash", "cheque"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let amount: number;
  let method: "account" | "cash" | "cheque";
  try {
    const body = await req.json();
    const parsed = bodySchema.parse(body);
    amount = parsed.amount;
    method = parsed.method;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invSnap = await collections.invoices.doc(id).get();
  if (!invSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invoice = invSnap.data()!;
  const total = invoice.total ?? 0;

  const paymentsSnap = await collections.paymentsRef(id).get();
  const paidSoFar = paymentsSnap.docs.reduce((s, d) => s + (d.data().amount ?? 0), 0);
  const newPaid = paidSoFar + amount;
  const status = computeInvoiceStatus(invoice.dueDate, total, newPaid);

  const now = new Date().toISOString();
  await collections.paymentsRef(id).add({
    amount,
    method,
    paidAt: now,
    notes: null,
    createdAt: now,
  });
  await collections.invoices.doc(id).update({
    status,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, status });
}
