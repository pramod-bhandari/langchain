"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center space-x-8">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Search
          </Link>
          <Link
            href="/upload"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/upload" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Upload
          </Link>
          <Link
            href="/agent-search"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/agent-search"
                ? "text-foreground"
                : "text-foreground/60"
            )}
          >
            AI Agent
          </Link>
        </div>
      </div>
    </nav>
  );
}
