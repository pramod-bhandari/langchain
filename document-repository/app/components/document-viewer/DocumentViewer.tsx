"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/app/lib/supabase/client";
import { Document } from "@/app/types/document";
import Spinner from "@/app/components/ui/Spinner";
import PDFViewer from "./PDFViewer";
import ImageViewer from "./ImageViewer";
import TextViewer from "./TextViewer";
import ProgressiveDocumentLoader from "./ProgressiveDocumentLoader";

interface DocumentData {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface DocumentViewerProps {
  documentId: string;
  fileType?: string;
  filePath?: string;
  enableProgressiveLoading?: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  fileType,
  filePath,
  enableProgressiveLoading = true,
}) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLargeFile, setIsLargeFile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);

        // If we don't have file path, fetch document details first
        if (!filePath) {
          const { data, error: fetchError } = await getSupabaseClient()
            .from("documents")
            .select("*")
            .eq("id", documentId)
            .single();

          if (fetchError) throw fetchError;
          if (!data) throw new Error("Document not found");

          setDocumentData(data as DocumentData);
          filePath = data.file_path;
          fileType = data.file_type;

          // Check if the file is large (>5MB)
          if (data.file_size && data.file_size > 5 * 1024 * 1024) {
            setIsLargeFile(true);
          }
        }

        if (!filePath) {
          throw new Error("No file path provided");
        }

        // Skip fetching the URL if we're using progressive loading for large files
        if (isLargeFile && enableProgressiveLoading) {
          setLoading(false);
          return;
        }

        // Get the signed URL from Supabase storage
        const fileUrl = filePath
          ? getSupabaseClient()
              .storage.from("documentscollection")
              .getPublicUrl(filePath).data.publicUrl
          : null;

        if (fileUrl) {
          setDocumentUrl(fileUrl);
        } else {
          throw new Error("Failed to get signed URL");
        }
      } catch (err) {
        console.error("Error loading document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document"
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [documentId, filePath, isLargeFile, enableProgressiveLoading]);

  // Show the progressive loader for large files if enabled
  if (isLargeFile && enableProgressiveLoading && filePath && fileType) {
    return (
      <ProgressiveDocumentLoader
        documentId={documentId}
        filePath={filePath}
        fileType={fileType}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  // Render based on file type
  if (!documentUrl) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
        Document preview not available
      </div>
    );
  }

  if (fileType?.includes("pdf")) {
    return (
      <div className="w-full h-[800px] border border-gray-300 rounded-lg overflow-hidden">
        <iframe
          src={`${documentUrl}#toolbar=1`}
          className="w-full h-full"
          title={documentData?.title || "PDF Document"}
        />
      </div>
    );
  }

  if (fileType?.includes("image")) {
    return (
      <div className="max-w-full overflow-auto border border-gray-300 rounded-lg p-2">
        <img
          src={documentUrl}
          alt={documentData?.title || "Document Image"}
          className="max-w-full"
        />
      </div>
    );
  }

  if (fileType?.includes("text")) {
    return (
      <div className="w-full h-[600px] border border-gray-300 rounded-lg p-4 overflow-auto bg-white">
        <iframe
          src={documentUrl}
          className="w-full h-full"
          title={documentData?.title || "Text Document"}
        />
      </div>
    );
  }

  // Generic file download link for unsupported types
  return (
    <div className="p-6 bg-gray-50 border border-gray-300 rounded-lg text-center">
      <p className="mb-4">
        Preview not available for this file type: {fileType}
      </p>
      <a
        href={documentUrl}
        download
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Download File
      </a>
    </div>
  );
};

export default DocumentViewer;
