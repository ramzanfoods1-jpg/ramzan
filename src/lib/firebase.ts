import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import path from "path";

function getFirebaseCredential(): ReturnType<typeof cert> | undefined {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      return cert(JSON.parse(key) as ServiceAccount);
    } catch {
      return undefined;
    }
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (keyPath) {
    try {
      const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
      const json = readFileSync(resolved, "utf8");
      return cert(JSON.parse(json) as ServiceAccount);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function ensureFirebase() {
  if (!getApps().length) {
    const credential = getFirebaseCredential();
    if (!credential) {
      throw new Error(
        "Firebase not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH in the deployment environment."
      );
    }
    initializeApp({
      credential,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
    });
  }
}

export function getAdminAuth() {
  ensureFirebase();
  return getAuth();
}

export function getAdminDb() {
  ensureFirebase();
  return getFirestore();
}

/** @deprecated Use getAdminAuth() so init is lazy and build works without credentials */
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    return (getAdminAuth() as unknown as Record<string, unknown>)[prop as string];
  },
});

/** @deprecated Use getAdminDb() so init is lazy and build works without credentials */
export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    return (getAdminDb() as unknown as Record<string, unknown>)[prop as string];
  },
});

export function getFirestoreCollections() {
  const db = getAdminDb();
  return {
    users: db.collection("users"),
    companySettings: db.collection("companySettings"),
    customers: db.collection("customers"),
    products: db.collection("products"),
    invoices: db.collection("invoices"),
    counters: db.collection("counters"),
    paymentsRef: (invoiceId: string) =>
      db.collection("invoices").doc(invoiceId).collection("payments"),
  };
}
