import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  collections,
  getNextInvoiceNumber,
  type InvoiceDoc,
  type LineItem,
} from "@/lib/db";
import { adminAuth } from "@/lib/firebase";
import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  salespersonId: z.string().min(1),
  job: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(), // YYYY-MM-DD from date input or full ISO datetime
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(1).optional(),
});

function mapInvoiceToJson(
  doc: DocumentSnapshot,
  customer?: { id: string; name: string },
  salesperson?: { id: string; name: string; salespersonCode: string | null }
) {
  const d = doc.data()!;
  return {
    id: doc.id,
    ...d,
    subtotal: d.subtotal ?? 0,
    salesTax: d.salesTax ?? 0,
    total: d.total ?? 0,
    date: d.date,
    dueDate: d.dueDate ?? null,
    sentAt: d.sentAt ?? null,
    customer: customer ?? { id: d.customerId, name: d.customerName ?? "" },
    salesperson: salesperson ?? { id: d.salespersonId, name: "", salespersonCode: null },
  };
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = (searchParams.get("search") ?? "").trim();

    const snap = await collections.invoices.orderBy("date", "desc").get();
    let docs = snap.docs;
    if (status && status !== "all") {
      docs = docs.filter((d) => (d.data().status as string) === status);
    }
    if (search) {
      const num = parseInt(search, 10);
      if (!Number.isNaN(num)) {
        docs = docs.filter((d) => d.data().invoiceNumber === num);
      } else {
        const lower = search.toLowerCase();
        docs = docs.filter((d) => {
          const name = (d.data().customerName ?? "") as string;
          return name.toLowerCase().includes(lower);
        });
      }
    }

    const customerIds = Array.from(new Set(docs.map((d) => d.data().customerId)));
    const salespersonIds = Array.from(new Set(docs.map((d) => d.data().salespersonId)));
    const customerSnaps = await Promise.all(
      customerIds.map((id) => collections.customers.doc(id).get())
    );
    const salespersonSnaps = await Promise.all(
      salespersonIds.map((id) => collections.users.doc(id).get())
    );
    const customers = Object.fromEntries(
      customerSnaps.filter((s) => s.exists).map((s) => [s.id, { id: s.id, name: s.data()!.name }])
    );
    const salespeople = Object.fromEntries(
      salespersonSnaps
        .filter((s) => s.exists)
        .map((s) => {
          const d = s.data()!;
          return [s.id, { id: s.id, name: d.name, salespersonCode: d.salespersonCode ?? null }];
        })
    );

    const invoices = docs.map((doc) =>
      mapInvoiceToJson(
        doc,
        customers[doc.data().customerId],
        salespeople[doc.data().salespersonId]
      )
    );
    return NextResponse.json(invoices);
  } catch (e) {
    console.error("[GET /api/invoices]", e);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const customerSnap = await collections.customers.doc(data.customerId).get();
    const customerName = customerSnap.exists ? (customerSnap.data()!.name as string) : "";
    let salespersonName = "";
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
          // keep empty
        }
      }
    }
    const nextNumber = await getNextInvoiceNumber();
    const subtotal = data.lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
    const settingsSnap = await collections.companySettings.doc("default").get();
    const settings = settingsSnap.data();
    const taxRate = data.taxRate ?? (settings?.taxRate ?? 0);
    const salesTax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + salesTax;
    const totalBoxes = data.lineItems.reduce((sum, l) => sum + l.qty, 0);
    const now = new Date().toISOString();
    const lineItems: LineItem[] = data.lineItems.map((l, i) => ({
      productId: l.productId ?? null,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      sortOrder: i,
    }));
    const invoiceDoc: Omit<InvoiceDoc, "lineItems"> & { lineItems: LineItem[] } = {
      invoiceNumber: nextNumber,
      date: now.slice(0, 10),
      customerId: data.customerId,
      customerName,
      salespersonId: data.salespersonId,
      salespersonName: salespersonName || undefined,
      job: data.job ?? null,
      paymentTerms: data.paymentTerms ?? null,
      dueDate: data.dueDate ?? null,
      status: "draft",
      subtotal,
      salesTax,
      total,
      totalBoxes,
      lineItems,
      createdAt: now,
      updatedAt: now,
    };
    const ref = collections.invoices.doc();
    await ref.set(invoiceDoc);

    const salespersonSnap = await collections.users.doc(data.salespersonId).get();
    const salesperson = salespersonSnap.exists
      ? {
          id: salespersonSnap.id,
          name: salespersonSnap.data()!.name,
          salespersonCode: salespersonSnap.data()!.salespersonCode ?? null,
        }
      : { id: data.salespersonId, name: "", salespersonCode: null };
    return NextResponse.json({
      id: ref.id,
      ...invoiceDoc,
      customer: { id: data.customerId, name: customerName, email: customerSnap.data()?.email ?? null },
      salesperson,
      date: invoiceDoc.date,
      dueDate: invoiceDoc.dueDate,
      lineItems: invoiceDoc.lineItems.map((l) => ({
        ...l,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors.map((err) => err.message).join("; ") || "Invalid request";
      return NextResponse.json({ error: { message: msg }, details: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: { message: "Create failed" } }, { status: 500 });
  }
}
