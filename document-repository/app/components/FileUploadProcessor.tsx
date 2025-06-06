"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DocumentProcessingService,
  ProcessingProgress,
} from "../lib/client/documentProcessingService";
import { FilePlus, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [processingService, setProcessingService] =
    useState<DocumentProcessingService | null>(null);

  // Initialize the processing service
  useEffect(() => {
    if (typeof window !== "undefined") {
      const service = DocumentProcessingService.getInstance();
      setProcessingService(service);

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
    },
    []
  );

  // Handle progress updates
  const handleProgress = useCallback((progressUpdate: ProcessingProgress) => {
    setProgress(progressUpdate.progress);
    setMessage(progressUpdate.message);
    setStatus(progressUpdate.status);
  }, []);

  // Process and upload the file
  const handleUpload = useCallback(async () => {
    if (!file || !processingService) {
      toast.error("Please select a file");
      return;
    }

    try {
      setIsUploading(true);
      setStatus("processing");
      setProgress(0);
      setMessage("Starting processing...");

      // Set OpenAI key if provided
      if (openAiKey && generateEmbeddings) {
        processingService.setOpenAiKey(openAiKey);
      }

      // Use the processing service to upload the document
      const result = await processingService.uploadLargeDocument(
        file,
        "/api/documents/upload",
        {
          chunkSize,
          overlap,
          generateEmbeddings,
          chunkUploadSize: 5 * 1024 * 1024, // 5MB chunks
        },
        handleProgress
      );

      setStatus("completed");
      setProgress(100);
      setMessage("Upload complete");
      toast.success("Document uploaded successfully");

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(result.documentId);
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
    processingService,
    openAiKey,
    generateEmbeddings,
    chunkSize,
    overlap,
    handleProgress,
    onUploadComplete,
  ]);

  // Save OpenAI key
  const saveOpenAiKey = useCallback(() => {
    if (processingService) {
      processingService.setOpenAiKey(openAiKey);
      localStorage.setItem("openai_api_key", openAiKey);
      toast.success("API key saved");
    }
  }, [processingService, openAiKey]);

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
            accept=".pdf,.txt,.doc,.docx,.xlsx,.xls"
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
