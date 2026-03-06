"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: number;
  date: string;
  status: string;
  job: string | null;
  paymentTerms: string | null;
  dueDate: string | null;
  subtotal: number;
  salesTax: number;
  total: number;
  totalBoxes: number | null;
  sentAt: string | null;
  viewToken: string | null;
  customer: { id: string; name: string; email: string | null };
  salesperson: { name: string; salespersonCode?: string | null; email?: string | null };
  lineItems: Array<{
    id: string;
    description: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
  }>;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"account" | "cash" | "cheque">("account");
  const [sending, setSending] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownloadPdf() {
    const res = await fetch(`/api/invoices/${id}/pdf`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoice?.invoiceNumber ?? id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSend() {
    setSending(true);
    const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      alert(data.message ?? "Invoice sent.");
      router.refresh();
      fetch(`/api/invoices/${id}`).then((r) => r.json()).then(setInvoice);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to send.");
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    setPaymentSubmitting(true);
    const res = await fetch(`/api/invoices/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method: paymentMethod }),
    });
    setPaymentSubmitting(false);
    if (res.ok) {
      setPaymentAmount("");
      router.refresh();
      fetch(`/api/invoices/${id}`).then((r) => r.json()).then(setInvoice);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to record payment.");
    }
  }

  if (loading) return <div className="text-gray-600">Loading…</div>;
  if (!invoice) return <div className="text-red-600">Invoice not found.</div>;

  const paidTotal = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = invoice.total - paidTotal;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">Invoice #{invoice.invoiceNumber}</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {invoice.customer.name} · {new Date(invoice.date).toLocaleDateString()} ·{" "}
            <span className="capitalize">{invoice.status.replace("_", " ")}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 min-h-[44px]"
          >
            Download PDF
          </button>
          {invoice.status === "draft" && (
            <>
              <Link
                href={`/invoices/${id}/edit`}
                className="rounded border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 min-h-[44px] inline-flex items-center"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
              >
                {sending ? "Sending…" : "Send by email"}
              </button>
            </>
          )}
          <Link
            href="/invoices"
            className="rounded border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 min-h-[44px] inline-flex items-center"
          >
            Back to list
          </Link>
        </div>
      </div>
      <div className="rounded border bg-white p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">To</p>
            <p className="font-medium">{invoice.customer.name}</p>
            {invoice.customer.email && (
              <p className="text-sm text-gray-600">{invoice.customer.email}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Salesperson</p>
            <p className="font-medium">{invoice.salesperson.name}</p>
          </div>
          {(invoice.job || invoice.paymentTerms || invoice.dueDate) && (
            <div className="sm:col-span-2 flex flex-wrap gap-4 sm:gap-6 text-sm">
              {invoice.job && <span>Job: {invoice.job}</span>}
              {invoice.paymentTerms && <span>Terms: {invoice.paymentTerms}</span>}
              {invoice.dueDate && (
                <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0 sm:rounded-none">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700 whitespace-nowrap">Qty</th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700 whitespace-nowrap">Unit price</th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700 whitespace-nowrap">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.lineItems.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-900 min-w-0 max-w-[200px] sm:max-w-none">{l.description}</td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right text-gray-600 whitespace-nowrap">{l.qty}</td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right text-gray-600 whitespace-nowrap">
                    £{Number(l.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right font-medium whitespace-nowrap">
                    £{Number(l.lineTotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="text-right space-y-1">
            {invoice.totalBoxes != null && (
              <p className="text-sm text-gray-600">Total boxes: {invoice.totalBoxes}</p>
            )}
            <p className="text-sm text-gray-600">Subtotal: £{invoice.subtotal.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Sales tax: £{invoice.salesTax.toFixed(2)}</p>
            <p className="font-medium">Total: £{invoice.total.toFixed(2)}</p>
          </div>
        </div>
      </div>
      {invoice.payments.length > 0 && (
        <div className="rounded border bg-white p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="font-medium mb-2">Payments</h2>
          <ul className="space-y-1">
            {invoice.payments.map((p) => (
              <li key={p.id} className="text-sm">
                £{Number(p.amount).toFixed(2)} via {p.method} on{" "}
                {new Date(p.paidAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-medium">
            Paid: £{paidTotal.toFixed(2)} — Balance: £{balance.toFixed(2)}
          </p>
        </div>
      )}
      {balance > 0 && (
        <div className="rounded border bg-white p-4 sm:p-6">
          <h2 className="font-medium mb-2">Record payment</h2>
          <form onSubmit={handleRecordPayment} className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-end flex-wrap">
            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-500">Amount (£)</label>
              <input
                type="number"
                step={0.01}
                min={0.01}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="rounded border border-gray-300 bg-white px-3 py-2.5 text-gray-900 w-full sm:w-28 min-h-[44px]"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-500">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as "account" | "cash" | "cheque")
                }
                className="rounded border border-gray-300 bg-white px-3 py-2.5 text-gray-900 w-full sm:w-auto min-h-[44px]"
              >
                <option value="account">Account</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={paymentSubmitting || !paymentAmount}
              className="rounded bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
            >
              {paymentSubmitting ? "Recording…" : "Record"}
            </button>
          </form>
        </div>
      )}
      {invoice.viewToken && (
        <p className="mt-4 text-sm text-gray-500">
          Shareable link:{" "}
          <a
            href={`${typeof window !== "undefined" ? window.location.origin : ""}/invoice/view?token=${invoice.viewToken}`}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View invoice
          </a>
        </p>
      )}
    </div>
  );
}
