"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Product = {
  id: string;
  description: string;
  unitPrice: number;
  packetsPerBox: number | null;
};

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [packetsPerBox, setPacketsPerBox] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((p: Product) => {
        setDescription(p.description);
        setUnitPrice(String(p.unitPrice));
        setPacketsPerBox(p.packetsPerBox != null ? String(p.packetsPerBox) : "");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        unitPrice: parseFloat(unitPrice) || 0,
        packetsPerBox: packetsPerBox ? parseInt(packetsPerBox, 10) : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message ?? "Failed to update");
      return;
    }
    router.push("/products");
    router.refresh();
  }

  if (fetching) return <div className="text-gray-600">Loading…</div>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Edit product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit price (£)</label>
          <input
            type="number"
            step={0.01}
            min={0}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Packets per box</label>
          <input
            type="number"
            min={1}
            value={packetsPerBox}
            onChange={(e) => setPacketsPerBox(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
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
            href="/products"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
