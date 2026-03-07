"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Request" },
  { href: "/jobs", label: "Verify" },
];

export function Nav() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  if (isLoginPage) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-sabi-border bg-sabi-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-sabi-text">Sabi</span>
          <span className="hidden sm:inline rounded bg-sabi-accent/15 px-2 py-0.5 text-[10px] font-medium text-sabi-accent uppercase tracking-wider">
            Beta
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sabi-surface text-sabi-text border border-sabi-border"
                    : "text-sabi-muted hover:text-sabi-text hover:bg-sabi-surface"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
