"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: number;
  date: string;
  status: string;
  total: number;
  customer: { id: string; name: string };
  salesperson: { salespersonCode: string | null };
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  due: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
};

function InvoicesContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatusFilter(s);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    fetch(`/api/invoices?${params}`)
      .then(async (r) => {
        const text = await r.text();
        if (!text) return [];
        try {
          const data = JSON.parse(text);
          if (!r.ok) throw new Error(data?.error?.message ?? data?.error ?? "Request failed");
          return data;
        } catch (e) {
          if (e instanceof SyntaxError) return [];
          throw e;
        }
      })
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Invoices</h1>
        <Link
          href="/invoices/new"
          className="rounded bg-blue-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-blue-700 text-center min-h-[44px] flex items-center justify-center sm:inline-flex"
        >
          New invoice
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 w-full sm:w-auto min-h-[44px]"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="due">Due</option>
          <option value="overdue">Overdue</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
        </select>
        <input
          type="search"
          placeholder="Search by invoice # or customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 w-full sm:w-64 min-h-[44px]"
        />
      </div>
      <div className="rounded border bg-white overflow-hidden">
        <div className="max-h-[440px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap bg-gray-50">#</th>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap bg-gray-50">Date</th>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap bg-gray-50">Customer</th>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 hidden lg:table-cell bg-gray-50">Salesperson</th>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap bg-gray-50">Status</th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700 whitespace-nowrap bg-gray-50">Total</th>
                <th className="px-3 sm:px-4 py-2 w-14 sm:w-20 bg-gray-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(inv.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-900 min-w-0 max-w-[120px] sm:max-w-none truncate sm:truncate-none">
                    {inv.customer.name}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-600 hidden lg:table-cell">
                    {inv.salesperson.salespersonCode ?? "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        statusColors[inv.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                    £{inv.total.toFixed(2)}
                  </td>
                  <td className="px-3 sm:px-4 py-2">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm text-blue-600 hover:underline inline-block py-1"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {loading && <p className="text-gray-500 py-2">Loading…</p>}
      {!loading && invoices.length === 0 && (
        <p className="mt-4 text-gray-500">No invoices match your filters.</p>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="text-gray-600">Loading…</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
