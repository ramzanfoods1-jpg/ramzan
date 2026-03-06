"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Customer = { id: string; name: string };
type User = { id: string; name: string | null; email?: string | null; salespersonCode: string | null };
type Product = { id: string; description: string; unitPrice: number };
type LineRow = {
  id?: string;
  productId: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export default function EditInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [job, setJob] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<LineRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
    ]).then(([c, u, p, inv]) => {
      setCustomers(c);
      setUsers(u);
      setProducts(p);
      setCustomerId(inv.customerId);
      setSalespersonId(inv.salespersonId);
      setJob(inv.job ?? "");
      setPaymentTerms(inv.paymentTerms ?? "");
      setDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : "");
      setLines(
        inv.lineItems?.map((l: { id: string; productId: string | null; description: string; qty: number; unitPrice: number; lineTotal: number }) => ({
          id: l.id,
          productId: l.productId ?? "",
          description: l.description,
          qty: l.qty,
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
        })) ?? []
      );
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [id]);

  function addLine() {
    setLines((prev) => [...prev, { productId: "", description: "", qty: 1, unitPrice: 0, lineTotal: 0 }]);
  }

  function updateLine(i: number, upd: Partial<LineRow>) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...upd };
      if (upd.qty != null || upd.unitPrice != null) {
        const q = upd.qty ?? next[i].qty;
        const u = upd.unitPrice ?? next[i].unitPrice;
        next[i].lineTotal = Math.round(q * u * 100) / 100;
      }
      return next;
    });
  }

  function setProductForLine(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (p) {
      updateLine(i, {
        productId: p.id,
        description: p.description,
        unitPrice: p.unitPrice,
        lineTotal: Math.round(p.unitPrice * lines[i].qty * 100) / 100,
      });
    }
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const total = subtotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validLines = lines.filter((l) => l.description.trim() && l.lineTotal >= 0);
    if (validLines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        salespersonId,
        job: job || null,
        paymentTerms: paymentTerms || null,
        dueDate: dueDate || null,
        lineItems: validLines.map((l) => ({
          productId: l.productId || null,
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message ?? "Failed to update");
      return;
    }
    router.push(`/invoices/${id}`);
    router.refresh();
  }

  if (fetching) return <div className="text-gray-600">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Salesperson</label>
            <select
              value={salespersonId}
              onChange={(e) => setSalespersonId(e.target.value)}
              required
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-gray-900 min-h-[44px]"
            >
              <option value="">Select…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email || "Unnamed"} {u.salespersonCode ? `(${u.salespersonCode})` : ""}
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                No salespeople in the list. <Link href="/register" className="text-blue-600 hover:underline font-medium">Register a new user</Link> to add salespeople.
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Job</label>
            <input
              type="text"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Line items</label>
            <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline">
              + Add line
            </button>
          </div>
          <div className="rounded border overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700">Product</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 w-32">Description</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-700 w-20">Qty</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-700 w-24">Unit £</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-700 w-24">Total £</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      <select
                        value={line.productId}
                        onChange={(e) => setProductForLine(i, e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        <option value="">—</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.description.slice(0, 40)}…</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(i, { qty: parseInt(e.target.value, 10) || 1 })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={line.unitPrice || ""}
                        onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={line.lineTotal || ""}
                        onChange={(e) => updateLine(i, { lineTotal: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Subtotal: £{subtotal.toFixed(2)} — Total: £{total.toFixed(2)}
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <Link
            href={`/invoices/${id}`}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
