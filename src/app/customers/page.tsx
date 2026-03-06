"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  _count: { invoices: number };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-600">Loading…</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded bg-blue-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-blue-700 text-center min-h-[44px] flex items-center justify-center sm:inline-flex"
        >
          Add customer
        </Link>
      </div>
      <div className="rounded border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 hidden sm:table-cell">Email</th>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700 hidden md:table-cell">Phone</th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700">Invoices</th>
                <th className="px-3 sm:px-4 py-2 w-14 sm:w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-900 min-w-0 max-w-[180px] sm:max-w-none truncate">
                    {c.name}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-600 hidden sm:table-cell min-w-0 max-w-[160px] truncate">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-600 hidden md:table-cell">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right text-gray-600">{c._count.invoices}</td>
                  <td className="px-3 sm:px-4 py-2">
                    <Link
                      href={`/customers/${c.id}/edit`}
                      className="text-sm text-blue-600 hover:underline inline-block py-1"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
