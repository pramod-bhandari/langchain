"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  title: string;
  description: string;
  file_type: string;
  file_size: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const { data, error } = await getSupabaseClient()
          .from("documents")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error("Error fetching documents:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch documents"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    else return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("text")) return "📝";
    if (fileType.includes("spreadsheet") || fileType.includes("excel"))
      return "📊";
    if (fileType.includes("word") || fileType.includes("document")) return "📃";
    return "📁";
  };

  const handleDocumentClick = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Document Repository</h1>
          <div className="flex gap-2">
            <Link
              href="/progressive-viewer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              title="View large documents with progressive loading"
            >
              Progressive Viewer
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Chat
            </Link>
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Home
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse text-gray-500">
              Loading documents...
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            Error: {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No documents found</p>
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Documents
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-blue-800">
                  New: Progressive Document Loading
                </h2>
                <p className="text-sm text-blue-600">
                  Experience faster loading of large documents with our new
                  progressive loading feature.
                </p>
              </div>
              <Link
                href="/progressive-viewer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                Try Now →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc, index) => (
                <div
                  key={`${doc.id}-${index}`}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleDocumentClick(doc.id)}
                >
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                    <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
                    <div className="truncate flex-1">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {doc.file_size > 5 * 1024 * 1024 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Large File
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {doc.description || "No description"}
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{doc.file_type.split("/")[1]?.toUpperCase()}</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
