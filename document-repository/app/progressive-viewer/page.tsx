"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase/client";
import DocumentViewer from "@/app/components/document-viewer/DocumentViewer";
import Link from "next/link";

interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export default function ProgressiveViewerPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [enableProgressiveLoading, setEnableProgressiveLoading] =
    useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const { data, error } = await supabase
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

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <Link
            href="/documents"
            className="text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Back to Documents
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            Progressive Document Viewer
          </h1>
          <p className="text-gray-600 mb-4">
            Efficiently view large documents with progressive loading
          </p>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enableProgressiveLoading"
              checked={enableProgressiveLoading}
              onChange={() =>
                setEnableProgressiveLoading(!enableProgressiveLoading)
              }
              className="mr-2 h-4 w-4 text-blue-600"
            />
            <label htmlFor="enableProgressiveLoading">
              Enable Progressive Loading
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
              <div className="animate-pulse text-gray-500">
                Loading documents...
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mb-6">
              Error: {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 bg-gray-50 text-center rounded-lg border border-gray-200 mb-6">
              <p className="text-gray-600 mb-4">No documents found</p>
              <Link
                href="/upload"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Documents
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc, index) => (
                  <div
                    key={`${doc.id}-${index}`}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <h3 className="font-medium">{doc.title}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      {doc.file_type} • {formatFileSize(doc.file_size)}
                      {doc.file_size > 5 * 1024 * 1024 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Large File
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedDocument ? (
                <div className="border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-medium">Document Preview</h2>
                    <div className="text-sm text-gray-500 mt-1">
                      {selectedDocument.title} •{" "}
                      {formatFileSize(selectedDocument.file_size)}
                    </div>
                  </div>
                  <div className="p-4">
                    <DocumentViewer
                      documentId={selectedDocument.id}
                      fileType={selectedDocument.file_type}
                      filePath={selectedDocument.file_path}
                      enableProgressiveLoading={enableProgressiveLoading}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] bg-gray-50 text-gray-500 rounded-lg border border-gray-200">
                  Select a document to preview
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
