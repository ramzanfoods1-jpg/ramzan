/**
 * Seed Firestore with products and optional company settings.
 * Run: npx tsx scripts/seed-firestore.ts
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file) in .env
 */
import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      return cert(JSON.parse(key) as ServiceAccount);
    } catch {
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON");
    }
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (keyPath) {
    try {
      const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
      const json = readFileSync(resolved, "utf8");
      return cert(JSON.parse(json) as ServiceAccount);
    } catch (e) {
      throw new Error(`Failed to load Firebase service account from path: ${keyPath}`);
    }
  }
  throw new Error("Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH in .env");
}

if (!getApps().length) {
  initializeApp({ credential: getCredential() });
}
const db = getFirestore();

const products = [
  { description: "Lamb Samosa (20) (15 Packets Per Box)", unitPrice: 37.5, packetsPerBox: 15 },
  { description: "Chicken Samosas (20) (15 Packets Per Box)", unitPrice: 37.5, packetsPerBox: 15 },
  { description: "Vegetable Samosa (20) (15 Packets Per Box)", unitPrice: 37.5, packetsPerBox: 15 },
  { description: "Lamb Samosa (50) (6 Packets Per Box)", unitPrice: 36, packetsPerBox: 6 },
  { description: "Chicken Samosas (50) (6 Packets Per Box)", unitPrice: 36, packetsPerBox: 6 },
  { description: "Vegetable Samosa (50) (6 Packets Per Box)", unitPrice: 36, packetsPerBox: 6 },
  { description: "Lamb Spring Roll (20) (15 Packets Per Box)", unitPrice: 37.5, packetsPerBox: 15 },
  { description: "Chicken Spring Roll (20) (15 Packets Per Box)", unitPrice: 37.5, packetsPerBox: 15 },
  { description: "Vegetable Spring Roll (20) (15 Packets Per Box)", unitPrice: 37.5, packetsPerBox: 15 },
  { description: "Lamb Spring Roll (50) (6 Packets Per Box)", unitPrice: 36, packetsPerBox: 6 },
  { description: "Chicken Spring Roll (50) (6 Packets Per Box)", unitPrice: 36, packetsPerBox: 6 },
  { description: "Vegetable Spring Roll (50) (6 Packets Per Box)", unitPrice: 36, packetsPerBox: 6 },
  { description: "Lamb Sheesh Kebab (18) (16 Packets Per Box)", unitPrice: 80, packetsPerBox: 16 },
  { description: "Chicken Sheesh Kebab (18) (16 Packets Per Box)", unitPrice: 72, packetsPerBox: 16 },
  { description: "Lamb Charcoal Kebabs (15) (12 Packets Per Box)", unitPrice: 78, packetsPerBox: 12 },
  { description: "Chicken Charcoal Kebab (15) (12 Packets Per Box)", unitPrice: 72, packetsPerBox: 12 },
  { description: "Lamb Chappal Kebab (8) (16 Packets Per Box)", unitPrice: 60, packetsPerBox: 16 },
  { description: "Chicken Chappal Kebab (8) (16 Packets Per Box)", unitPrice: 60, packetsPerBox: 16 },
  { description: "Chicken Pokora (500g) (15 Packets Per Box)", unitPrice: 65, packetsPerBox: 15 },
  { description: "Vegetable Pokora (500g) (15 Packets Per Box)", unitPrice: 45, packetsPerBox: 15 },
  { description: "Masala Fish (500g) (15 Packets Per Box)", unitPrice: 65, packetsPerBox: 15 },
];

async function main() {
  const productsRef = db.collection("products");
  const existing = await productsRef.limit(1).get();
  if (!existing.empty) {
    console.log("Products already seeded, skipping.");
    return;
  }
  const now = new Date().toISOString();
  for (const p of products) {
    await productsRef.doc().set({
      description: p.description,
      unitPrice: p.unitPrice,
      packetsPerBox: p.packetsPerBox,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`Seeded ${products.length} products.`);

  const settingsRef = db.collection("companySettings").doc("default");
  const settingsSnap = await settingsRef.get();
  if (!settingsSnap.exists) {
    await settingsRef.set({
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
      updatedAt: now,
    });
    console.log("Created default company settings doc.");
  }

  const countersRef = db.collection("counters").doc("invoiceNumber");
  const counterSnap = await countersRef.get();
  if (!counterSnap.exists) {
    await countersRef.set({ value: 0, updatedAt: now });
    console.log("Initialized invoice number counter.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
