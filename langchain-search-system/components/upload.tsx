"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";

// DEPRECATED: This component is no longer used and should not be imported.
// Use the FileUpload component from @/components/ui/file-upload instead.
export function DeprecatedUpload() {
  console.warn(
    "DeprecatedUpload component is being used. Please use FileUpload component instead."
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<{
    totalPages?: number;
    processedPages?: number;
  }>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  };

  const processFileInChunks = async (
    fileInfo: {
      fileName: string;
      fileType: string;
      publicUrl: string;
      storageKey: string;
    },
    abortSignal: AbortSignal
  ) => {
    try {
      setIsProcessing(true);
      setProcessingProgress(0);

      let startPage = 1;
      let isComplete = false;
      let totalPages = 0;
      let processedPages = 0;
      const CHUNK_SIZE = 5; // Process 5 pages at a time for PDFs

      // For non-PDF files, process in a single chunk
      if (fileInfo.fileType !== "application/pdf") {
        const response = await fetch("/api/process-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...fileInfo,
            startPage: 1,
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process file");
        }

        setProcessingProgress(100);
        setIsProcessing(false);
        return;
      }

      // Process PDF in chunks
      while (!isComplete && !abortSignal.aborted) {
        const endPage = startPage + CHUNK_SIZE - 1;

        console.log(`Processing pages ${startPage} to ${endPage}`);

        const response = await fetch("/api/process-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...fileInfo,
            startPage,
            endPage,
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process file chunk");
        }

        const data = await response.json();
        console.log("Chunk processed:", data);

        // Update total pages if we're getting it for the first time
        if (data.totalPages && totalPages === 0) {
          totalPages = data.totalPages;
        }

        // Update processed pages
        processedPages = data.processedPages;

        // Calculate progress percentage
        const progressPercent =
          totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0;

        setProcessingProgress(progressPercent);
        setProcessingStatus({
          totalPages,
          processedPages,
        });

        // Check if we're done
        isComplete = data.isComplete;
        if (!isComplete) {
          startPage = processedPages + 1;
        }
      }

      if (abortSignal.aborted) {
        throw new Error("Processing was cancelled");
      }

      setProcessingProgress(100);
      setIsProcessing(false);
    } catch (error) {
      console.error("Processing error:", error);
      setIsProcessing(false);
      if (!(error instanceof Error && error.name === "AbortError")) {
        alert(
          error instanceof Error ? error.message : "Failed to process file"
        );
      }
      throw error;
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create a new AbortController for this upload
      abortControllerRef.current = new AbortController();
      const abortSignal = abortControllerRef.current.signal;

      setIsUploading(true);
      setUploadProgress(0);

      console.log("Starting upload for file:", file.name);
      const formData = new FormData();
      formData.append("file", file, file.name);

      const xhr = new XMLHttpRequest();

      // Set up progress tracking for the upload phase
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          console.log("Upload progress:", progress);
          setUploadProgress(progress);
        }
      };

      // Handle cancellation
      abortSignal.addEventListener("abort", () => {
        console.log("Upload cancelled");
        xhr.abort();
      });

      // Upload the file
      const uploadResult = await new Promise<{
        success: boolean;
        message: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        publicUrl: string;
        storageKey: string;
      }>((resolve, reject) => {
        xhr.onload = () => {
          console.log("Upload response status:", xhr.status);
          console.log("Upload response:", xhr.responseText);

          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log("Upload successful:", data);
              resolve(data);
            } catch (error) {
              console.error("Failed to parse response:", error);
              reject(new Error("Failed to process server response"));
            }
          } else {
            let errorMessage = xhr.statusText || "Upload failed";
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If response is not JSON, use status text
            }
            console.error("Upload failed:", errorMessage);
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => {
          console.error("Network error occurred");
          reject(new Error("Network error occurred"));
        };

        // Configure and send the request
        xhr.open("POST", "/api/upload", true);
        xhr.setRequestHeader("Accept", "application/json");
        // Don't set Content-Type header - let the browser set it with the boundary
        xhr.send(formData);
      });

      setIsUploading(false);
      setUploadProgress(100);

      // After successful upload, process the file
      if (uploadResult.success) {
        await processFileInChunks(
          {
            fileName: file.name,
            fileType: file.type,
            publicUrl: uploadResult.publicUrl,
            storageKey: uploadResult.storageKey,
          },
          abortSignal
        );
      }

      // Reset the file input
      event.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setIsProcessing(false);

      if (!(error instanceof Error && error.name === "AbortError")) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to upload file. Please try again."
        );
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center relative">
        {(isUploading || isProcessing) && (
          <button
            onClick={handleCancel}
            className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <input
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileUpload}
          disabled={isUploading || isProcessing}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer inline-block">
          <Button
            variant="outline"
            disabled={isUploading || isProcessing}
            className="w-full"
          >
            {isUploading
              ? "Uploading..."
              : isProcessing
              ? "Processing..."
              : "Upload Document"}
          </Button>
        </label>

        {isUploading && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-1">Uploading</div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {uploadProgress}% Complete
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-1">Processing</div>
            <Progress value={processingProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {processingProgress}% Complete
              {processingStatus.totalPages &&
                processingStatus.processedPages && (
                  <span className="ml-1">
                    (Page {processingStatus.processedPages} of{" "}
                    {processingStatus.totalPages})
                  </span>
                )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
