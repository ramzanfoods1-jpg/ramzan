import Link from "next/link";
import { getSession } from "@/lib/auth";
import { collections } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [recentSnap, dueSnap, overdueSnap, paidSnap] = await Promise.all([
    collections.invoices.orderBy("date", "desc").limit(10).get(),
    collections.invoices.where("status", "==", "due").get(),
    collections.invoices.where("status", "==", "overdue").get(),
    collections.invoices.where("status", "==", "paid").get(),
  ]);
  const dueCount = dueSnap.size;
  const overdueCount = overdueSnap.size;
  const paidCount = paidSnap.size;

  const customerIds = Array.from(new Set(recentSnap.docs.map((d) => d.data().customerId)));
  const customerSnaps = await Promise.all(
    customerIds.map((id) => collections.customers.doc(id).get())
  );
  const customers = Object.fromEntries(
    customerSnaps.filter((s) => s.exists).map((s) => [s.id, { name: s.data()!.name }])
  );

  const invoices = recentSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      invoiceNumber: d.invoiceNumber,
      date: d.date,
      status: d.status,
      total: d.total ?? 0,
      customer: { name: customers[d.customerId]?.name ?? "" },
    };
  });

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link
          href="/invoices?status=due"
          className="rounded-lg border bg-amber-50 border-amber-200 p-4 hover:bg-amber-100 min-h-[72px] flex flex-col justify-center"
        >
          <p className="text-sm font-medium text-amber-800">Due</p>
          <p className="text-2xl font-bold text-amber-900">{dueCount}</p>
        </Link>
        <Link
          href="/invoices?status=overdue"
          className="rounded-lg border bg-red-50 border-red-200 p-4 hover:bg-red-100 min-h-[72px] flex flex-col justify-center"
        >
          <p className="text-sm font-medium text-red-800">Overdue</p>
          <p className="text-2xl font-bold text-red-900">{overdueCount}</p>
        </Link>
        <Link
          href="/invoices?status=paid"
          className="rounded-lg border bg-green-50 border-green-200 p-4 hover:bg-green-100 min-h-[72px] flex flex-col justify-center"
        >
          <p className="text-sm font-medium text-green-800">Paid</p>
          <p className="text-2xl font-bold text-green-900">{paidCount}</p>
        </Link>
      </div>
      <div className="rounded border bg-white overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b flex justify-between items-center">
          <h2 className="font-medium text-base sm:text-inherit">Recent invoices</h2>
          <Link
            href="/invoices"
            className="text-sm text-blue-600 hover:underline py-2"
          >
            View all
          </Link>
        </div>
        <div className="hidden md:block max-h-[320px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">Customer</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">Status</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 bg-gray-50">Total</th>
                <th className="px-4 py-2 w-20 bg-gray-50" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {typeof inv.date === "string" ? new Date(inv.date).toLocaleDateString() : inv.date.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inv.customer.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 capitalize">
                    {inv.status.replace("_", " ")}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                    £{Number(inv.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden divide-y divide-gray-200 max-h-[320px] overflow-y-auto">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <Link
                href={`/invoices/${inv.id}`}
                className="block px-3 sm:px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">#{inv.invoiceNumber} · {inv.customer.name}</p>
                    <p className="text-sm text-gray-600">
                      {typeof inv.date === "string" ? new Date(inv.date).toLocaleDateString() : inv.date.toLocaleDateString()}
                      <span className="ml-2 capitalize">{inv.status.replace("_", " ")}</span>
                    </p>
                  </div>
                  <span className="font-medium text-gray-900 shrink-0">£{Number(inv.total).toFixed(2)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {invoices.length === 0 && (
        <p className="mt-4 text-gray-500 text-sm sm:text-base">
          No invoices yet.{" "}
          <Link href="/invoices/new" className="text-blue-600 hover:underline">
            Create your first invoice
          </Link>
        </p>
      )}
    </div>
  );
}
