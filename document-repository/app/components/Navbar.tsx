"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? "font-medium text-blue-600"
      : "text-gray-600 hover:text-blue-600";
  };

  return (
    <nav className="bg-white shadow-sm py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Link
            href="/"
            className="font-bold text-xl text-gray-900 flex items-center"
          >
            <span className="mr-2">📄</span>
            <span>DocChat</span>
          </Link>

          <span className="hidden sm:inline-block text-gray-400 mx-2">|</span>

          <div className="hidden sm:flex items-center space-x-6 ml-6">
            <Link
              href="/documents"
              className={`text-sm transition ${isActive("/documents")}`}
            >
              Documents
            </Link>
            <Link
              href="/upload"
              className={`text-sm transition ${isActive("/upload")}`}
            >
              Upload
            </Link>
            <Link
              href="/chat"
              className={`text-sm transition ${isActive("/chat")}`}
            >
              Chat
            </Link>
            <Link
              href="/progressive-viewer"
              className={`text-sm transition ${isActive(
                "/progressive-viewer"
              )}`}
            >
              Progressive Viewer
            </Link>
          </div>
        </div>

        <div className="flex sm:hidden">
          <button className="text-gray-600 hover:text-gray-900 focus:outline-none">
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
}
