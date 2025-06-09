"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import DocumentViewer from "@/app/components/document-viewer/DocumentViewer";
import AnnotationSystem from "@/app/components/annotations/AnnotationSystem";
import ClientDocumentProcessor from "@/app/components/document-processing/ClientDocumentProcessor";
import { useRouter, useParams } from "next/navigation";

interface DocumentData {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchDocument() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await getSupabaseClient()
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Document not found");

        setDocument(data as DocumentData);
      } catch (err) {
        console.error("Error fetching document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch document"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [documentId]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    else return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteDocument = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await getSupabaseClient()
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      // Also delete from storage
      if (document?.file_path) {
        const { error: storageError } = await getSupabaseClient()
          .storage.from("documentscollection")
          .remove([document.file_path]);

        if (storageError) console.error("Storage delete error:", storageError);
      }

      router.push("/documents");
    } catch (err) {
      console.error("Error deleting document:", err);
      alert(
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to delete document"
      );
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col p-4 md:p-8">
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading document...</div>
        </div>
      </main>
    );
  }

  if (error || !document) {
    return (
      <main className="flex min-h-screen flex-col p-4 md:p-8">
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            Error: {error || "Document not found"}
          </div>
          <Link href="/documents" className="text-blue-600 hover:underline">
            Back to Documents
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Link
                href="/documents"
                className="text-blue-600 hover:underline mb-2 inline-block"
              >
                ← Back to Documents
              </Link>
              <h1 className="text-2xl font-bold mt-2">{document.title}</h1>
              {document.description && (
                <p className="text-gray-600 mt-1">{document.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/chat?documentId=${document.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Chat with Document
              </Link>
              <button
                onClick={handleDeleteDocument}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">File Type</h3>
              <p>{document.file_type}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">File Size</h3>
              <p>{formatFileSize(document.file_size)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Uploaded</h3>
              <p>{new Date(document.created_at).toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="flex items-center">
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    document.metadata?.indexed
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                ></span>
                {document.metadata?.indexed ? "Indexed" : "Processing"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-medium">Document Preview</h2>
                </div>
                <div className="p-4">
                  <DocumentViewer
                    documentId={document.id}
                    fileType={document.file_type}
                    filePath={document.file_path}
                  />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <div className="border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-medium">Notes & Annotations</h2>
                </div>
                <div className="p-4">
                  <AnnotationSystem documentId={document.id} />
                </div>
              </div>

              {/* Show the client-side document processor if document is not yet indexed */}
              {document.metadata?.indexed !== true && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-medium">Document Processing</h2>
                  </div>
                  <div className="p-4">
                    <ClientDocumentProcessor
                      documentId={document.id}
                      file={
                        new File([], document.title, {
                          type: document.file_type,
                        })
                      }
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Process document in browser to make it searchable
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
