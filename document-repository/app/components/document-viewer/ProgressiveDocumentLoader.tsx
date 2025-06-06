"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/app/lib/supabase/client";
import { extractPdfText } from "@/app/lib/processors/pdfExtractor";

interface DocumentData {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface ProgressiveDocumentLoaderProps {
  documentId: string;
  fileType: string;
  filePath: string;
  previewSize?: number; // Default to 1MB for initial preview
}

/**
 * Progressively loads large documents in chunks to provide a responsive UX
 * - Shows a preview immediately while loading the full document
 * - Loads chunks in the background to avoid UI freezes
 * - Updates the progress as each chunk is loaded
 * - Handles different file types appropriately
 */
const ProgressiveDocumentLoader: React.FC<ProgressiveDocumentLoaderProps> = ({
  documentId,
  fileType,
  filePath,
  previewSize = 1 * 1024 * 1024, // 1MB preview
}) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize component and start loading
  useEffect(() => {
    async function initializeLoader() {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Fetch document metadata if needed
        if (!documentData) {
          const { data, error: fetchError } = await getSupabaseClient()
            .from("documents")
            .select("*")
            .eq("id", documentId)
            .single();

          if (fetchError) throw fetchError;
          if (!data) throw new Error("Document not found");

          setDocumentData(data as DocumentData);
          setTotalBytes(data.file_size || 0);
        }

        // Get a signed URL for the preview and full download
        const { data: fileData, error: fileError } = await getSupabaseClient()
          .storage.from("documentscollection")
          .createSignedUrl(filePath, 3600); // 1 hour

        if (fileError) throw fileError;
        setDocumentUrl(fileData.signedUrl);

        // Start progressive loading
        loadProgressively(fileData.signedUrl);
      } catch (err) {
        console.error("Error initializing document loader:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document"
        );
        setLoading(false);
      }
    }

    initializeLoader();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [documentId, filePath, documentData]);

  // Progressive loading function
  const loadProgressively = async (url: string) => {
    try {
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Fetch with progress tracking
      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      // Get content length
      const contentLength =
        Number(response.headers.get("Content-Length")) || totalBytes;
      if (contentLength > 0) {
        setTotalBytes(contentLength);
      }

      // Create a reader to read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Unable to read response body");
      }

      const newChunks: Blob[] = [];
      let receivedBytes = 0;
      let previewChunk: Blob | null = null;

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Update progress
        receivedBytes += value.length;
        setLoadedBytes(receivedBytes);
        setProgress(Math.round((receivedBytes / contentLength) * 100));

        // Store this chunk
        const chunk = new Blob([value], {
          type: response.headers.get("Content-Type") || fileType,
        });
        newChunks.push(chunk);

        // If this is the first chunk and within preview size, use it for preview
        if (!previewChunk && receivedBytes <= previewSize) {
          previewChunk = new Blob(newChunks, {
            type: response.headers.get("Content-Type") || fileType,
          });

          // Create a preview URL
          const previewObjectUrl = URL.createObjectURL(previewChunk);
          setPreviewUrl(previewObjectUrl);

          // For PDF files, try to extract some text for preview
          if (fileType.includes("pdf")) {
            try {
              const arrayBuffer = await previewChunk.arrayBuffer();
              const previewTextContent = await extractPdfText(
                new File([arrayBuffer], "preview.pdf", {
                  type: "application/pdf",
                })
              );
              setPreviewText(
                previewTextContent.slice(0, 2000) +
                  (previewTextContent.length > 2000 ? "..." : "")
              );
            } catch (error) {
              console.error("Error extracting preview text:", error);
            }
          }
        }

        // Every few chunks, update the full blob for progressive rendering
        if (newChunks.length % 5 === 0 || receivedBytes === contentLength) {
          const fullBlob = new Blob(newChunks, {
            type: response.headers.get("Content-Type") || fileType,
          });

          // For text files, update the text content
          if (fileType.includes("text")) {
            const text = await fullBlob.text();
            setFullText(text);
          }
        }
      }

      // Create the final blob from all chunks
      const fullBlob = new Blob(newChunks, {
        type: response.headers.get("Content-Type") || fileType,
      });
      const fullObjectUrl = URL.createObjectURL(fullBlob);
      setDocumentUrl(fullObjectUrl);
      setLoading(false);
      setProgress(100);

      // Extract full text for PDFs if needed
      if (fileType.includes("pdf")) {
        try {
          const arrayBuffer = await fullBlob.arrayBuffer();
          const fullTextContent = await extractPdfText(
            new File([arrayBuffer], "document.pdf", { type: "application/pdf" })
          );
          setFullText(fullTextContent);
        } catch (error) {
          console.error("Error extracting full text:", error);
        }
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }

      console.error("Error loading document progressively:", err);
      setError(err instanceof Error ? err.message : "Failed to load document");
      setLoading(false);
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (documentUrl && documentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [previewUrl, documentUrl]);

  // Loading indicator with progress
  if (loading && progress < 10) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <div className="animate-pulse mb-4">Preparing document...</div>
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error: {error}
      </div>
    );
  }

  // Show preview while loading
  if (loading && previewUrl) {
    return (
      <div className="w-full">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <div>Loading document... {progress}%</div>
            <div>
              {(loadedBytes / (1024 * 1024)).toFixed(1)}MB /
              {(totalBytes / (1024 * 1024)).toFixed(1)}MB
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Document preview based on file type */}
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {fileType.includes("pdf") && previewText ? (
            <div className="p-4 bg-white h-[600px] overflow-auto">
              <div className="text-sm font-medium mb-2 text-blue-600">
                Preview (while loading):
              </div>
              <p className="whitespace-pre-line">{previewText}</p>
            </div>
          ) : fileType.includes("image") ? (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50">
              <img
                src={previewUrl}
                alt="Document Preview"
                className="max-w-full max-h-[600px] object-contain"
              />
              <div className="mt-2 text-sm text-gray-500">
                Preview quality (full quality loading...)
              </div>
            </div>
          ) : fileType.includes("text") && fullText ? (
            <div className="p-4 bg-white h-[600px] overflow-auto">
              <div className="text-sm font-medium mb-2 text-blue-600">
                Preview (while loading):
              </div>
              <pre className="whitespace-pre-wrap">{fullText}</pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] bg-gray-50">
              <div className="text-center p-6">
                <div className="animate-pulse mb-2">Loading preview...</div>
                <div className="text-sm text-gray-500">
                  Document will be available shortly
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full document view when loaded
  if (!documentUrl) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
        Document preview not available
      </div>
    );
  }

  // Render based on file type
  if (fileType.includes("pdf")) {
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

  if (fileType.includes("image")) {
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

  if (fileType.includes("text")) {
    return (
      <div className="w-full h-[600px] border border-gray-300 rounded-lg p-4 overflow-auto bg-white">
        {fullText ? (
          <pre className="whitespace-pre-wrap">{fullText}</pre>
        ) : (
          <iframe
            src={documentUrl}
            className="w-full h-full"
            title={documentData?.title || "Text Document"}
          />
        )}
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

export default ProgressiveDocumentLoader;
