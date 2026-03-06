import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { getCompanyForPdf } from "@/lib/company-settings";
import { buildInvoicePdf } from "@/lib/pdf";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const session = await getSession();

  const invSnap = await collections.invoices.doc(id).get();
  if (!invSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invData = invSnap.data()!;
  if (token && invData.viewToken !== token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!token && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customerSnap, salespersonSnap, company] = await Promise.all([
    collections.customers.doc(invData.customerId).get(),
    collections.users.doc(invData.salespersonId).get(),
    getCompanyForPdf(),
  ]);
  const customer = customerSnap.exists ? customerSnap.data()! : { name: "" };
  const salesperson = salespersonSnap.exists ? salespersonSnap.data()! : { name: "", salespersonCode: "" };
  const invoiceData = {
    invoiceNumber: invData.invoiceNumber,
    date: invData.date,
    customerId: customer.customerId ?? "",
    customer: { name: customer.name ?? "" },
    salesperson: {
      name: salesperson.name ?? "",
      salespersonCode: salesperson.salespersonCode ?? "",
    },
    job: invData.job ?? null,
    paymentTerms: invData.paymentTerms ?? null,
    dueDate: invData.dueDate ?? null,
    lineItems: (invData.lineItems ?? []).map((l: { description: string; qty: number; unitPrice: number; lineTotal: number }) => ({
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
    totalBoxes: invData.totalBoxes ?? null,
    subtotal: invData.subtotal ?? 0,
    salesTax: invData.salesTax ?? 0,
    total: invData.total ?? 0,
  };

  const pdfBytes = await buildInvoicePdf(company, invoiceData);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invData.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
