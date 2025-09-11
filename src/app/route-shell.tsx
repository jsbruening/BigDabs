"use client";

import { usePathname } from "next/navigation";

export function ClientRouteShell({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const hide = pathname === "/signin";
 if (hide) return null;
 return <>{children}</>;
}
