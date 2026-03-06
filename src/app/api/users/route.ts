import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { collections } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snap = await collections.users.get();
  const byId = new Map(
    snap.docs.map((doc) => {
      const d = doc.data();
      return [
        doc.id,
        {
          id: doc.id,
          name: d.name ?? null,
          email: d.email ?? null,
          salespersonCode: d.salespersonCode ?? null,
        },
      ];
    })
  );
  if (!byId.has(session.id)) {
    byId.set(session.id, {
      id: session.id,
      name: session.name ?? null,
      email: session.email ?? null,
      salespersonCode: session.salespersonCode ?? null,
    });
  }
  const users = Array.from(byId.values()).sort((a, b) => {
    const na = (a.name || a.email || "").toLowerCase();
    const nb = (b.name || b.email || "").toLowerCase();
    return na.localeCompare(nb);
  });
  return NextResponse.json(users);
}
