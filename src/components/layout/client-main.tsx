"use client";

import { usePathname } from "next/navigation";

function isLessonRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "learn" && parts.length >= 3;
}

export function ClientMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isLessonRoute(pathname)) {
    return (
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
      {children}
    </main>
  );
}
