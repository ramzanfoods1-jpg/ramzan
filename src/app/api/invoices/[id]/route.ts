import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections, type InvoiceDoc, type LineItem } from "@/lib/db";
import { adminAuth } from "@/lib/firebase";
import { z } from "zod";

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
  sortOrder: z.number().int().optional(),
});

const updateSchema = z.object({
  customerId: z.string().min(1).optional(),
  salespersonId: z.string().min(1).optional(),
  job: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const invSnap = await collections.invoices.doc(id).get();
  if (!invSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invData = invSnap.data()!;
  const [customerSnap, salespersonSnap, paymentsSnap] = await Promise.all([
    collections.customers.doc(invData.customerId).get(),
    collections.users.doc(invData.salespersonId).get(),
    collections.paymentsRef(id).get(),
  ]);
  const customer = customerSnap.exists
    ? { id: customerSnap.id, ...customerSnap.data() }
    : { id: invData.customerId, name: "", email: null, phone: null, address: null, customerId: null, defaultTerms: null };
  const storedName = (invData as { salespersonName?: string }).salespersonName?.trim();
  const salespersonData = salespersonSnap.exists ? salespersonSnap.data()! : null;
  let salespersonName = storedName || (salespersonData?.name ?? null);
  let salespersonCode = salespersonData?.salespersonCode ?? null;
  let salespersonEmail = salespersonData?.email ?? null;
  if (!salespersonName && (!salespersonCode && !salespersonEmail || !salespersonSnap.exists)) {
    try {
      const authUser = await adminAuth.getUser(invData.salespersonId);
      salespersonEmail = salespersonEmail ?? authUser.email ?? null;
      salespersonName = salespersonName ?? authUser.displayName ?? null;
    } catch {
      // keep nulls
    }
  }
  const salesperson = {
    id: invData.salespersonId,
    name: salespersonName || salespersonEmail || salespersonCode || "—",
    salespersonCode,
    email: salespersonEmail,
  };
  const payments = paymentsSnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      amount: p.amount,
      method: p.method,
      paidAt: p.paidAt,
      notes: p.notes ?? null,
    };
  });
  const lineItems = (invData.lineItems ?? []).slice().sort((a: LineItem, b: LineItem) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return NextResponse.json({
    id: invSnap.id,
    ...invData,
    customer,
    salesperson,
    lineItems,
    payments,
    subtotal: invData.subtotal ?? 0,
    salesTax: invData.salesTax ?? 0,
    total: invData.total ?? 0,
    date: invData.date,
    dueDate: invData.dueDate ?? null,
    sentAt: invData.sentAt ?? null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ref = collections.invoices.doc(id);
  const existingSnap = await ref.get();
  if (!existingSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = existingSnap.data()!;
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft invoices can be edited" },
      { status: 400 }
    );
  }
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const settingsSnap = await collections.companySettings.doc("default").get();
    const settings = settingsSnap.data();
    const taxRate = data.taxRate ?? (settings?.taxRate ?? 0);
    const lineItemsRaw = data.lineItems ?? (existing.lineItems ?? []).map((l: LineItem) => ({
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      sortOrder: l.sortOrder,
    }));
    const lineItems: LineItem[] = lineItemsRaw.map((l: { productId?: string | null; description: string; qty: number; unitPrice: number; lineTotal: number; sortOrder?: number }, i: number) => ({
      productId: l.productId ?? null,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      sortOrder: l.sortOrder ?? i,
    }));
    const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
    const salesTax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + salesTax;
    const totalBoxes = lineItems.reduce((sum, l) => sum + l.qty, 0);
    const dueDate = data.dueDate !== undefined
      ? (data.dueDate ?? null)
      : (existing.dueDate ?? null);
    let customerId = existing.customerId;
    let customerName = existing.customerName ?? "";
    if (data.customerId != null) {
      customerId = data.customerId;
      const custSnap = await collections.customers.doc(data.customerId).get();
      customerName = custSnap.exists ? (custSnap.data()!.name as string) : "";
    }
    let salespersonName: string | undefined;
    if (data.salespersonId != null) {
      if (data.salespersonId === session.id) {
        salespersonName = session.name ?? session.email ?? "";
      } else {
        const spSnap = await collections.users.doc(data.salespersonId).get();
        const spData = spSnap.exists ? spSnap.data()! : null;
        salespersonName = [spData?.name, spData?.salespersonCode, spData?.email].filter(Boolean).join(" ") || "";
        if (!salespersonName) {
          try {
            const authUser = await adminAuth.getUser(data.salespersonId);
            salespersonName = authUser.displayName ?? authUser.email ?? "";
          } catch {
            salespersonName = "";
          }
        }
      }
    }
    const now = new Date().toISOString();
    const payload: Partial<InvoiceDoc> & { lineItems: LineItem[]; updatedAt: string } = {
      ...(data.customerId != null && { customerId, customerName }),
      ...(data.salespersonId != null && { salespersonId: data.salespersonId, ...(salespersonName !== undefined && { salespersonName }) }),
      ...(data.job !== undefined && { job: data.job }),
      ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
      dueDate,
      subtotal,
      salesTax,
      total,
      totalBoxes,
      lineItems,
      updatedAt: now,
    };
    await ref.update(payload);
    const updated = await ref.get();
    const updatedData = updated.data()!;
    const [customerSnap, salespersonSnap] = await Promise.all([
      collections.customers.doc(updatedData.customerId).get(),
      collections.users.doc(updatedData.salespersonId).get(),
    ]);
    const customer = customerSnap.exists ? { id: customerSnap.id, ...customerSnap.data() } : { id: updatedData.customerId, name: "" };
    const storedSpName = (updatedData as { salespersonName?: string }).salespersonName?.trim();
    const spData = salespersonSnap.exists ? salespersonSnap.data()! : null;
    let spName = storedSpName || (spData?.name ?? null);
    let spCode = spData?.salespersonCode ?? null;
    let spEmail = spData?.email ?? null;
    if (!spName && (!spCode && !spEmail || !salespersonSnap.exists)) {
      try {
        const authUser = await adminAuth.getUser(updatedData.salespersonId);
        spEmail = spEmail ?? authUser.email ?? null;
        spName = spName ?? authUser.displayName ?? null;
      } catch {
        // keep nulls
      }
    }
    const salesperson = { id: updatedData.salespersonId, name: spName || spEmail || spCode || "—", salespersonCode: spCode, email: spEmail };
    return NextResponse.json({
      id: updated.id,
      ...updatedData,
      customer,
      salesperson,
      subtotal: updatedData.subtotal,
      salesTax: updatedData.salesTax,
      total: updatedData.total,
      date: updatedData.date,
      dueDate: updatedData.dueDate ?? null,
      sentAt: updatedData.sentAt ?? null,
      lineItems: (updatedData.lineItems ?? []).map((l: LineItem) => ({ ...l, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
    });
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
  const snap = await collections.invoices.doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = snap.data()!;
  if (data.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft invoices can be deleted" },
      { status: 400 }
    );
  }
  const paymentsSnap = await collections.paymentsRef(id).get();
  for (const d of paymentsSnap.docs) {
    await d.ref.delete();
  }
  await collections.invoices.doc(id).delete();
  return NextResponse.json({ ok: true });
}
