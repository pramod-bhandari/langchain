"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { FilePlus, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ClientDocumentProcessor from "./document-processing/ClientDocumentProcessor";

interface FileUploadProcessorProps {
  onUploadComplete?: (documentId: string) => void;
  showSettings?: boolean;
}

export default function FileUploadProcessor({
  onUploadComplete,
  showSettings = false,
}: FileUploadProcessorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("idle");
  const [message, setMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [openAiKey, setOpenAiKey] = useState<string>("");
  const [generateEmbeddings, setGenerateEmbeddings] = useState<boolean>(false);
  const [chunkSize, setChunkSize] = useState<number>(1000);
  const [overlap, setOverlap] = useState<number>(200);
  const [useClientProcessor, setUseClientProcessor] = useState<boolean>(false);

  // Initialize with stored API key
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if we have an OpenAI key stored
      const storedKey = localStorage.getItem("openai_api_key") || "";
      setOpenAiKey(storedKey);
      setGenerateEmbeddings(!!storedKey);
    }
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0] || null;
      setFile(selectedFile);
      setProgress(0);
      setStatus("idle");
      setMessage("");
      setIsUploading(false);

      // Check if this file should use client processing
      if (selectedFile) {
        const fileType =
          selectedFile.type || inferTypeFromName(selectedFile.name);
        // Use client processing for images and common document types
        setUseClientProcessor(
          fileType.startsWith("image/") ||
            fileType === "application/pdf" ||
            fileType ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            fileType ===
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      } else {
        setUseClientProcessor(false);
      }
    },
    []
  );

  // Infer file type from name when MIME type is not available
  const inferTypeFromName = (filename: string): string => {
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    const extensionMap: Record<string, string> = {
      pdf: "application/pdf",
      txt: "text/plain",
      csv: "text/csv",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      tiff: "image/tiff",
      md: "text/markdown",
    };

    return extensionMap[extension] || "application/octet-stream";
  };

  // Handle client processor progress
  const handleClientProcessingProgress = useCallback(
    (progress: number, message: string) => {
      setProgress(progress);
      setMessage(message);
      setStatus(progress === 100 ? "completed" : "processing");
    },
    []
  );

  // Handle client processor completion
  const handleClientProcessingComplete = useCallback(
    (data: unknown) => {
      setStatus("completed");
      setProgress(100);
      setMessage("Upload complete");
      toast.success("Document processed and uploaded successfully");

      // Notify parent component
      if (
        onUploadComplete &&
        data &&
        typeof data === "object" &&
        "id" in data
      ) {
        onUploadComplete(data.id as string);
      }

      setIsUploading(false);
    },
    [onUploadComplete]
  );

  // Process and upload the file
  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    setStatus("processing");
    setProgress(0);
    setMessage("Starting processing...");

    if (useClientProcessor) {
      // The ClientDocumentProcessor component will handle the process
      // Just keep the uploading state true
      return;
    }

    try {
      // Direct implementation for uploading file (legacy non-client processing path)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      if (openAiKey && generateEmbeddings) {
        formData.append("openAiKey", openAiKey);
        formData.append("generateEmbeddings", String(generateEmbeddings));
        formData.append("chunkSize", String(chunkSize));
        formData.append("overlap", String(overlap));
      }

      // Update progress
      setProgress(20);
      setMessage("Uploading file...");

      // Send to upload endpoint
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      setStatus("completed");
      setProgress(100);
      setMessage("Upload complete");
      toast.success("Document uploaded successfully");

      // Notify parent component
      if (onUploadComplete && data.id) {
        onUploadComplete(data.id);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unknown error");
      toast.error(
        "Upload failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsUploading(false);
    }
  }, [
    file,
    useClientProcessor,
    openAiKey,
    generateEmbeddings,
    chunkSize,
    overlap,
    onUploadComplete,
  ]);

  // Save OpenAI key
  const saveOpenAiKey = useCallback(() => {
    localStorage.setItem("openai_api_key", openAiKey);
    toast.success("API key saved");
  }, [openAiKey]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            accept=".pdf,.txt,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp,.tiff"
            disabled={isUploading}
          />
        </div>

        {showSettings && (
          <div className="mb-4 p-4 border rounded-md">
            <h3 className="font-medium mb-2">Processing Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">
                  OpenAI API Key (for embeddings)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded text-sm"
                    placeholder="sk-..."
                  />
                  <Button size="sm" onClick={saveOpenAiKey}>
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="generate-embeddings"
                  checked={generateEmbeddings}
                  onChange={(e) => setGenerateEmbeddings(e.target.checked)}
                  className="mr-2"
                  disabled={!openAiKey}
                />
                <label htmlFor="generate-embeddings" className="text-sm">
                  Generate embeddings client-side
                </label>
              </div>

              <div>
                <label className="block text-sm mb-1">Chunk Size</label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded text-sm"
                  min="100"
                  max="10000"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Chunk Overlap</label>
                <input
                  type="number"
                  value={overlap}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded text-sm"
                  min="0"
                  max="500"
                />
              </div>
            </div>
          </div>
        )}

        {file && (
          <div className="mb-4">
            <p className="text-sm mb-2">
              Selected file: <span className="font-medium">{file.name}</span> (
              {(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            {useClientProcessor && !isUploading ? (
              <div className="mt-2 p-2 bg-gray-50 border rounded-md mb-2">
                <p className="text-xs text-gray-600 mb-1">
                  This file will be processed with client-side OCR/extraction
                </p>
              </div>
            ) : null}
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        )}

        {/* Show ClientDocumentProcessor when needed */}
        {file && useClientProcessor && isUploading && (
          <div>
            <ClientDocumentProcessor
              file={file}
              onProcessingProgress={handleClientProcessingProgress}
              onProcessingComplete={handleClientProcessingComplete}
            />
          </div>
        )}

        {status !== "idle" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {status === "processing" && "Processing..."}
                {status === "extracted" && "Extraction complete"}
                {status === "progress" && "Uploading..."}
                {status === "uploaded" && "Upload complete"}
                {status === "completed" && "Processing complete"}
                {status === "error" && "Error"}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs mt-2 text-gray-500">{message}</p>

            {status === "completed" && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Document processed and uploaded successfully
              </div>
            )}

            {status === "error" && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {message || "An error occurred during processing"}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
