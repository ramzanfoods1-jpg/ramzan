import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getFirestoreCollections } from "./firebase";

function getCollections() {
  return getFirestoreCollections();
}

/** Lazy collections: only connects to Firestore when first used (allows build without credentials). */
export const collections = new Proxy({} as ReturnType<typeof getFirestoreCollections>, {
  get(_, prop) {
    return (getCollections() as Record<string, unknown>)[prop as string];
  },
});

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "due"
  | "overdue"
  | "partially_paid"
  | "paid";

export type PaymentMethod = "account" | "cash" | "cheque";

export interface LineItem {
  id?: string;
  productId?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder?: number;
}

export interface InvoiceDoc {
  invoiceNumber: number;
  date: string;
  customerId: string;
  customerName?: string; // denormalized for search
  salespersonId: string;
  salespersonName?: string; // denormalized for display
  job?: string | null;
  paymentTerms?: string | null;
  dueDate?: string | null;
  status: InvoiceStatus;
  subtotal: number;
  salesTax: number;
  total: number;
  totalBoxes?: number | null;
  sentAt?: string | null;
  viewToken?: string | null;
  lineItems: LineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDoc {
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  notes?: string | null;
  createdAt: string;
}

export async function getNextInvoiceNumber(): Promise<number> {
  const db = getAdminDb();
  const ref = db.collection("counters").doc("invoiceNumber");
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? (snap.data()?.value ?? 0) : 0) + 1;
    tx.set(ref, { value: next, updatedAt: new Date().toISOString() });
    return next;
  });
  return result as number;
}

export function computeInvoiceStatus(
  dueDate: string | null | undefined,
  total: number,
  paidTotal: number
): InvoiceStatus {
  if (paidTotal >= total) return "paid";
  if (paidTotal > 0) {
    if (dueDate) {
      return new Date(dueDate) < new Date() ? "overdue" : "due";
    }
    return "partially_paid";
  }
  if (dueDate) {
    return new Date(dueDate) < new Date() ? "overdue" : "due";
  }
  return "sent";
}

export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}
