import { NextResponse } from "next/server";
import { collections } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const snap = await collections.invoices.where("viewToken", "==", token).limit(1).get();
  if (snap.empty) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const doc = snap.docs[0];
  const data = doc.data();
  return NextResponse.json({ id: doc.id, invoiceNumber: data.invoiceNumber });
}
