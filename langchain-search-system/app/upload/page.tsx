"use client";

import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

// Define the upload result type
interface UploadResult {
  success: boolean;
  message: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicUrl: string;
  storageKey: string;
}

export default function UploadPage() {
  const { toast } = useToast();
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    progress: number;
    totalPages?: number;
    processedPages?: number;
  }>({
    isProcessing: false,
    progress: 0,
  });

  // Process file in chunks (5 pages per chunk for PDFs)
  const processFileInChunks = async (
    fileInfo: {
      fileName: string;
      fileType: string;
      publicUrl: string;
      storageKey: string;
      totalPages?: number;
    },
    abortSignal: AbortSignal
  ) => {
    try {
      setProcessingStatus({
        isProcessing: true,
        progress: 0,
      });

      let startPage = 1;
      let isComplete = false;
      let totalPages = fileInfo.totalPages || 0;
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
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process file");
        }

        setProcessingStatus({
          isProcessing: false,
          progress: 100,
          totalPages: 1,
          processedPages: 1,
        });

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

        setProcessingStatus({
          isProcessing: true,
          progress: progressPercent,
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

      setProcessingStatus({
        isProcessing: false,
        progress: 100,
        totalPages,
        processedPages,
      });

      toast({
        title: "Success",
        description: "File processed successfully",
      });
    } catch (error) {
      console.error("Processing error:", error);
      setProcessingStatus({
        isProcessing: false,
        progress: 0,
      });

      if (error instanceof Error && error.name !== "AbortError") {
        toast({
          title: "Error",
          description: error.message || "Failed to process file",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const handleUpload = async (
    file: File,
    onProgress: (progress: number) => void,
    abortSignal: AbortSignal
  ) => {
    try {
      console.log("Starting upload for file:", file.name);
      const formData = new FormData();
      formData.append("file", file, file.name);

      const xhr = new XMLHttpRequest();

      // Set up progress tracking for the upload phase
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          console.log("Upload progress:", progress);
          onProgress(progress);
        }
      };

      // Handle errors
      xhr.onerror = () => {
        console.error("Network error occurred");
        throw new Error("Network error occurred");
      };

      // Handle cancellation
      abortSignal.addEventListener("abort", () => {
        console.log("Upload cancelled");
        xhr.abort();
      });

      // Open and send the request
      const apiUrl = "/api/upload";
      console.log("Sending request to:", apiUrl);

      // Wait for the upload to complete
      const uploadResult = await new Promise<UploadResult>(
        (resolve, reject) => {
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
          xhr.open("POST", apiUrl, true);
          xhr.setRequestHeader("Accept", "application/json");
          // Don't set Content-Type header - let the browser set it with the boundary
          xhr.send(formData);
        }
      );

      // After successful upload, start processing the file
      if (uploadResult && uploadResult.success) {
        // Show success message for upload phase
        toast({
          title: "Upload Successful",
          description: "File uploaded, now processing content...",
        });

        // Start processing the file in chunks
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
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        toast({
          title: "Cancelled",
          description: "File upload was cancelled",
        });
      } else {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to upload file",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Upload Documents</h1>
        <p className="text-gray-600 mb-8">
          Upload your documents to make them searchable. Currently supporting
          PDF and TXT files.
        </p>
        <FileUpload
          onUpload={handleUpload}
          supportedFormats={[".pdf", ".txt"]}
          className="mb-8"
        />

        {processingStatus.isProcessing && (
          <div className="mt-8 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Processing Document</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${processingStatus.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {processingStatus.progress}% Complete
              {processingStatus.totalPages &&
                processingStatus.processedPages && (
                  <span className="ml-2">
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
