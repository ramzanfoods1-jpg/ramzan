"use client";

import { useEffect, useState } from "react";

type Settings = {
  companyName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  bankName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  chequesPayableTo: string | null;
  taxRate: number;
};

const defaultSettings: Settings = {
  companyName: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: null,
  bankName: "",
  sortCode: "",
  accountNumber: "",
  chequesPayableTo: "",
  taxRate: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...defaultSettings, ...data }))
      .catch(() => setMessage("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) setMessage("Saved.");
    else setMessage("Failed to save.");
  }

  if (loading) return <div className="text-gray-600">Loading…</div>;

  return (
    <div className="max-w-2xl w-full">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-900">Company settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Company name</label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
            className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-gray-900 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tagline</label>
          <input
            type="text"
            value={settings.tagline ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, tagline: e.target.value || null }))}
            placeholder="A Fresh Choice"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea
            value={settings.address ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value || null }))}
            rows={2}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              value={settings.phone ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value || null }))}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={settings.email ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value || null }))}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Logo URL</label>
          <input
            type="url"
            value={settings.logoUrl ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, logoUrl: e.target.value || null }))}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <hr className="border-gray-200" />
        <h2 className="font-medium text-gray-800">Bank details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bank name</label>
          <input
            type="text"
            value={settings.bankName ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, bankName: e.target.value || null }))}
            placeholder="Lloyds Bank"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sort code</label>
            <input
              type="text"
              value={settings.sortCode ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, sortCode: e.target.value || null }))}
              placeholder="30-99-50"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Account number</label>
            <input
              type="text"
              value={settings.accountNumber ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, accountNumber: e.target.value || null }))}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cheques payable to</label>
          <input
            type="text"
            value={settings.chequesPayableTo ?? ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, chequesPayableTo: e.target.value || null }))
            }
            placeholder="Ayman Frozen Foods Ltd."
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tax rate (0–1, e.g. 0.2 = 20%)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={settings.taxRate}
            onChange={(e) =>
              setSettings((s) => ({ ...s, taxRate: parseFloat(e.target.value) || 0 }))
            }
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        {message && <p className="text-sm text-gray-600">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
