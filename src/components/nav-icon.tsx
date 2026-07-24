import type { ReactNode } from "react";

type NavIconName = "home" | "book" | "orders" | "admin" | "login";

const iconPaths: Record<NavIconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  book: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v3.5M16 3.5v3.5M3.5 10.5h17" />
      <path d="M8 14h4M8 17h8" />
    </>
  ),
  orders: (
    <>
      <path d="M8 7h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V7" />
      <path d="M10 12h6M10 16h4" />
    </>
  ),
  admin: (
    <>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5 20.5c1.6-3.4 4-5 7-5s5.4 1.6 7 5" />
      <path d="M17.5 4.5 19 6l-1.5 1.5M6.5 4.5 5 6l1.5 1.5" />
    </>
  ),
  login: (
    <>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5 20.5c1.6-3.4 4-5 7-5s5.4 1.6 7 5" />
    </>
  ),
};

export function NavIcon({
  name,
  className = "h-5 w-5",
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {iconPaths[name]}
    </svg>
  );
}

export type { NavIconName };
