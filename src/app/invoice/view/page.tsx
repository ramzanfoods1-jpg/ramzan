"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function InvoiceViewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Missing invoice link.");
      setLoading(false);
      return;
    }
    fetch(`/api/invoices/by-token?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((inv) => {
        setInvoiceNumber(inv.invoiceNumber);
      })
      .catch(() => setError("Invoice not found or link expired."))
      .finally(() => setLoading(false));
  }, [token]);

  function handleDownload() {
    if (!token) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/invoices/pdf-by-token?token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  }

  if (loading) return <div className="p-4 sm:p-8 text-gray-600">Loading…</div>;
  if (error)
    return (
      <div className="p-4 sm:p-8 max-w-md mx-auto text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  if (!invoiceNumber) return null;

  return (
    <div className="p-4 sm:p-8 max-w-md mx-auto text-center">
      <h1 className="text-xl font-semibold mb-2 text-gray-900">Invoice #{invoiceNumber}</h1>
      <p className="text-gray-600 mb-4">You can view and download your invoice below.</p>
      <button
        type="button"
        onClick={handleDownload}
        className="rounded bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 min-h-[44px]"
      >
        Download PDF
      </button>
    </div>
  );
}

export default function InvoiceViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-600">Loading…</div>}>
      <InvoiceViewContent />
    </Suspense>
  );
}
