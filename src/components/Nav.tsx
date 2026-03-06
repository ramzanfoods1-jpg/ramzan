"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/settings", label: "Settings" },
];

type User = { id: string; email: string | null; name: string | null; salespersonCode: string | null };

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/register") {
      setUser(null);
      return;
    }
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login" || pathname === "/register") {
    return (
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 min-h-[52px] flex items-center">
          <Link href="/" className="flex items-center -my-1.5">
            <Image src="/logo.png" alt="Ramzan Food Products" width={200} height={80} className="h-14 w-auto object-contain block" priority />
          </Link>
        </div>
      </header>
    );
  }

  const isAuth = user && user !== "loading";

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 min-h-[52px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-1 shrink-0 -my-1.5">
            <Image src="/logo.png" alt="Ramzan Food Products" width={200} height={80} className="h-14 w-auto object-contain block" priority />
            {isAuth && (
              <span className="font-semibold text-gray-800 text-base sm:text-lg truncate max-w-[140px] sm:max-w-[200px]" title={user.name ?? user.email ?? ""}>
                {user.name ?? user.email}
              </span>
            )}
          </Link>
          {isAuth && (
            <div className="hidden md:flex gap-4">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium whitespace-nowrap ${
                    pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
        {isAuth && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-2 sm:px-0 min-h-[44px] min-w-[44px] sm:min-w-0 rounded-md hover:bg-gray-100 sm:hover:bg-transparent"
              >
                Logout
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        )}
      </nav>
      {isAuth && menuOpen && (
        <div className="md:hidden border-t bg-white px-3 py-3">
          <div className="flex flex-col gap-1">
            <p className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100">
              {user.name ?? user.email}
            </p>
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center py-3 px-3 rounded-md text-sm font-medium min-h-[44px] ${
                  pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center py-3 px-3 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px] text-left w-full"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
