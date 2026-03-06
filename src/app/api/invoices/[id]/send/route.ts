import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";
import { getCompanyForPdf } from "@/lib/company-settings";
import { buildInvoicePdf } from "@/lib/pdf";
import { Resend } from "resend";
import { randomUUID } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const invSnap = await collections.invoices.doc(id).get();
  if (!invSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invoice = invSnap.data()!;
  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft invoices can be sent" },
      { status: 400 }
    );
  }

  const customerSnap = await collections.customers.doc(invoice.customerId).get();
  const customer = customerSnap.exists ? customerSnap.data()! : {};
  const customerEmail = customer.email?.trim();
  if (!customerEmail) {
    return NextResponse.json(
      { error: "Customer has no email address" },
      { status: 400 }
    );
  }

  const [company, settingsSnap] = await Promise.all([
    getCompanyForPdf(),
    collections.companySettings.doc("default").get(),
  ]);
  const raw = settingsSnap.exists ? settingsSnap.data() : null;
  const settings = raw ?? {};
  const viewToken = invoice.viewToken ?? randomUUID();
  const salespersonSnap = await collections.users.doc(invoice.salespersonId).get();
  const salesperson = salespersonSnap.exists ? salespersonSnap.data()! : { name: "", salespersonCode: "" };
  const invoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    customerId: customer.customerId ?? "",
    customer: { name: customer.name ?? "" },
    salesperson: { name: salesperson.name ?? "", salespersonCode: salesperson.salespersonCode ?? "" },
    job: invoice.job ?? null,
    paymentTerms: invoice.paymentTerms ?? null,
    dueDate: invoice.dueDate ?? null,
    lineItems: (invoice.lineItems ?? []).map((l: { description: string; qty: number; unitPrice: number; lineTotal: number }) => ({
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
    totalBoxes: invoice.totalBoxes ?? null,
    subtotal: invoice.subtotal ?? 0,
    salesTax: invoice.salesTax ?? 0,
    total: invoice.total ?? 0,
  };
  const pdfBytes = await buildInvoicePdf(company, invoiceData);
  const viewLink = `${appUrl}/invoice/view?token=${viewToken}`;

  if (process.env.RESEND_API_KEY) {
    const from = (settings.email ?? company.email) ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({
      from: from && from.includes("@") ? `Ramzan IMS <${from}>` : "Ramzan IMS <onboarding@resend.dev>",
      to: customerEmail,
      subject: `Invoice #${invoice.invoiceNumber} from ${company.companyName}`,
      html: `
        <p>Dear ${customer.name ?? "Customer"},</p>
        <p>Please find attached invoice #${invoice.invoiceNumber}.</p>
        <p>Total: £${invoice.total.toFixed(2)}</p>
        <p>You can also view and download the invoice here: <a href="${viewLink}">${viewLink}</a></p>
        <p>Thank you for your business.</p>
      `,
      attachments: [
        { filename: `invoice-${invoice.invoiceNumber}.pdf`, content: Buffer.from(pdfBytes) },
      ],
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueDate = invoice.dueDate;
  const now = new Date().toISOString().slice(0, 10);
  let status: "sent" | "due" | "overdue" = "sent";
  if (dueDate) {
    status = dueDate < now ? "overdue" : "due";
  }
  await collections.invoices.doc(id).update({
    viewToken,
    sentAt: new Date().toISOString(),
    status,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ message: "Invoice sent successfully.", viewLink });
}
