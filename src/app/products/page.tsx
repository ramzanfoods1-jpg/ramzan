"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  description: string;
  unitPrice: number;
  packetsPerBox: number | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then(async (r) => {
        const data = await r.json();
        return Array.isArray(data) ? data : [];
      })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-600">Loading…</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Products</h1>
        <Link
          href="/products/new"
          className="rounded bg-blue-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-blue-700 text-center min-h-[44px] flex items-center justify-center sm:inline-flex"
        >
          Add product
        </Link>
      </div>
      <div className="rounded border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-700">
                  Description
                </th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700 whitespace-nowrap">
                  Unit price (£)
                </th>
                <th className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:table-cell">
                  Packets/box
                </th>
                <th className="px-3 sm:px-4 py-2 w-14 sm:w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(products ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-2 text-sm text-gray-900 min-w-0 max-w-[220px] sm:max-w-none">
                    <span className="line-clamp-2 sm:line-clamp-none">{p.description}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right text-gray-900 whitespace-nowrap">
                    £{p.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-3 sm:px-4 py-2 text-sm text-right text-gray-600 hidden sm:table-cell">
                    {p.packetsPerBox ?? "—"}
                  </td>
                  <td className="px-3 sm:px-4 py-2">
                    <Link
                      href={`/products/${p.id}/edit`}
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
      {!loading && (products ?? []).length === 0 && (
        <p className="mt-4 text-gray-500 text-sm sm:text-base">
          No products yet. Run <code className="bg-gray-100 px-1 rounded text-xs sm:text-sm">npm run seed</code> to
          load sample products, or add one manually.
        </p>
      )}
    </div>
  );
}
