"use client";

import React, { useState, useEffect } from "react";
import { extractPdfText } from "@/app/lib/processors/pdfExtractor";
import { extractDocxText } from "@/app/lib/processors/docxExtractor";
import { extractXlsxText } from "@/app/lib/processors/xlsxExtractor";
import { createWorker } from "tesseract.js";
import { useDocumentStore } from "@/app/store/documentStore";
import DocumentProcessorWorkerService from "@/app/lib/processors/documentProcessorWorkerService";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

interface ClientDocumentProcessorProps {
  documentId?: string;
  file: File;
  onProcessingProgress?: (progress: number, message: string) => void;
  onProcessingComplete?: (data: unknown) => void;
}

const ClientDocumentProcessor: React.FC<ClientDocumentProcessorProps> = ({
  documentId,
  file,
  onProcessingProgress,
  onProcessingComplete,
}) => {
  const [status, setStatus] = useState<
    "idle" | "processing" | "completed" | "error"
  >("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [workerSupported, setWorkerSupported] = useState<boolean>(false);
  // Using useDocumentStore() but not using updateDocumentStatus
  useDocumentStore();
  // Using a single state variable for process status messages
  const [processingStatusMessage, setProcessingStatusMessage] =
    useState<string>("");

  // Check if web workers are supported
  useEffect(() => {
    setWorkerSupported(typeof Worker !== "undefined");
  }, []);

  // Setup polling for document status
  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout | null = null;

    if (documentId && status === "processing" && workerSupported) {
      statusCheckInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/documents/status?id=${documentId}`
          );
          const data = await response.json();

          if (data.status === "completed") {
            setStatus("completed");
            setProgress(100);
            onProcessingProgress?.(100, "Processing complete");
            onProcessingComplete?.(true);
            if (statusCheckInterval) clearInterval(statusCheckInterval);
          } else if (data.status === "error") {
            setStatus("error");
            setError(data.error || "Processing failed");
            onProcessingProgress?.(0, "Processing failed");
            onProcessingComplete?.(false);
            if (statusCheckInterval) clearInterval(statusCheckInterval);
          } else if (data.progress) {
            setProgress(data.progress * 100);
            onProcessingProgress?.(
              data.progress * 100,
              data.message || "Processing..."
            );
          }
        } catch (error) {
          console.error("Error checking document status:", error);
        }
      }, 2000);
    }

    return () => {
      if (statusCheckInterval) clearInterval(statusCheckInterval);
    };
  }, [
    documentId,
    status,
    workerSupported,
    onProcessingProgress,
    onProcessingComplete,
  ]);

  /**
   * Infer file type from filename when MIME type is not available
   */
  function inferTypeFromName(filename: string): string {
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
  }

  const processFile = async (file: File) => {
    if (!file) return;

    setStatus("processing");
    setProcessingStatusMessage("Starting text extraction...");
    setProgress(10);
    if (onProcessingProgress) {
      onProcessingProgress(10, "Starting text extraction...");
    }

    try {
      console.log(
        `CLIENT PROCESSOR: Starting extraction for ${file.name} (${file.type}, ${file.size} bytes)`
      );

      // Extract text from the file based on its type
      let extractedText = "";
      let extractionMethod = "unknown";
      const fileType = file.type || inferTypeFromName(file.name);

      try {
        if (fileType === "application/pdf") {
          console.log("CLIENT PROCESSOR: Processing PDF file");
          setProcessingStatusMessage("Extracting text from PDF...");
          extractedText = await extractPdfText(file);
          extractionMethod = "pdf.js";
        } else if (
          fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          console.log("CLIENT PROCESSOR: Processing DOCX file");
          setProcessingStatusMessage("Extracting text from DOCX...");
          extractedText = await extractDocxText(file);
          extractionMethod = "mammoth.js";
        } else if (
          fileType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          console.log("CLIENT PROCESSOR: Processing Excel file");
          setProcessingStatusMessage("Extracting text from Excel file...");
          extractedText = await extractXlsxText(file);
          extractionMethod = "xlsx";
        } else if (fileType.startsWith("image/")) {
          console.log("CLIENT PROCESSOR: Processing image file with OCR");
          setProcessingStatusMessage("Performing OCR on image...");

          // Create a progress handler for the OCR process
          const handleOcrProgress = (progress: number, status: string) => {
            console.log(`OCR Progress: ${progress}%, Status: ${status}`);
            setProgress(progress);
            setProcessingStatusMessage(status);

            // Also notify the parent component if callback is provided
            if (onProcessingProgress) {
              onProcessingProgress(progress, status);
            }
          };

          console.log("CLIENT PROCESSOR: Starting OCR with Tesseract.js...");
          try {
            // Use Tesseract.js directly with basic configuration
            handleOcrProgress(10, "Creating OCR worker...");

            // Create worker without custom options to avoid type errors
            // @ts-expect-error - Type issues with Tesseract.js API
            const worker = await createWorker();

            handleOcrProgress(20, "OCR worker created, processing image...");

            // Set up progress reporting using console.log for debugging
            console.log("Starting OCR recognition process...");

            // Process the image
            handleOcrProgress(30, "Starting text recognition...");
            const result = await worker.recognize(file);
            extractedText = result.data.text;

            // Clean up
            console.log("Terminating OCR worker...");
            await worker.terminate();

            console.log("CLIENT PROCESSOR: OCR completed successfully");
            handleOcrProgress(100, "OCR processing complete!");
            extractionMethod = "tesseract.js";
          } catch (ocrError) {
            console.error("CLIENT PROCESSOR: OCR processing error:", ocrError);
            setError(
              `OCR processing error: ${
                ocrError instanceof Error ? ocrError.message : "Unknown error"
              }`
            );
            if (onProcessingProgress) {
              onProcessingProgress(
                0,
                `OCR error: ${
                  ocrError instanceof Error ? ocrError.message : "Unknown error"
                }`
              );
            }
            return;
          }
        } else if (
          fileType === "text/plain" ||
          fileType === "text/csv" ||
          fileType === "text/markdown"
        ) {
          console.log("CLIENT PROCESSOR: Processing text file");
          setProcessingStatusMessage("Reading text file...");
          extractedText = await file.text();
          extractionMethod = "text";
        } else {
          throw new Error(`Unsupported file type: ${fileType}`);
        }

        console.log(
          `CLIENT PROCESSOR: Extraction successful, got ${extractedText.length} characters using ${extractionMethod}`
        );
        console.log(
          `CLIENT PROCESSOR: Sample text: "${extractedText.substring(
            0,
            100
          )}..."`
        );
      } catch (extractError) {
        console.error(
          `CLIENT PROCESSOR: ${extractionMethod} extraction error:`,
          extractError
        );
        setError(
          `Extraction error: ${
            extractError instanceof Error
              ? extractError.message
              : "Unknown error"
          }`
        );
        return;
      }

      setProgress(40);
      setProcessingStatusMessage(
        `Text extracted (${extractedText.length} characters). Chunking...`
      );
      if (onProcessingProgress) {
        onProcessingProgress(
          40,
          `Text extracted (${extractedText.length} characters). Chunking...`
        );
      }

      // Split the text into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      console.log("CLIENT PROCESSOR: Creating chunks");
      const docs = await splitter.createDocuments([extractedText]);
      // Type explicitly as string[] to avoid any type
      const chunks: string[] = docs.map((doc) => doc.pageContent as string);
      console.log(`CLIENT PROCESSOR: Created ${chunks.length} chunks`);

      // Sample chunks
      if (chunks.length > 0) {
        console.log(
          `CLIENT PROCESSOR: First chunk sample: "${chunks[0].substring(
            0,
            50
          )}..."`
        );
      }

      setProgress(60);
      setProcessingStatusMessage(
        `Created ${chunks.length} text chunks. Uploading...`
      );
      if (onProcessingProgress) {
        onProcessingProgress(
          60,
          `Created ${chunks.length} text chunks. Uploading...`
        );
      }

      // Prepare metadata
      const metadata = {
        extractionMethod,
        chunksCount: chunks.length,
        textLength: extractedText.length,
        fileSize: file.size,
        fileType: file.type,
        wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      };

      console.log("CLIENT PROCESSOR: Metadata prepared:", metadata);

      // Upload file and extracted text to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("extractedText", extractedText);
      formData.append("extractedChunks", JSON.stringify(chunks));
      formData.append("extractionMetadata", JSON.stringify(metadata));

      console.log(
        "CLIENT PROCESSOR: Sending upload request with extracted data"
      );

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      // Handle the response
      if (!response.ok) {
        const errorData = await response.json();
        console.error("CLIENT PROCESSOR: Upload error response:", errorData);
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      console.log("CLIENT PROCESSOR: Upload successful, response:", data);

      setProgress(100);
      setStatus("completed");
      setProcessingStatusMessage("Processing completed successfully!");
      if (onProcessingProgress) {
        onProcessingProgress(100, "Processing completed successfully!");
      }

      // Notify the parent component
      if (onProcessingComplete) {
        onProcessingComplete(data);
      }
    } catch (err) {
      console.error("CLIENT PROCESSOR: Error processing document:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("error");
      if (onProcessingProgress) {
        onProcessingProgress(0, "Error processing document");
      }
    }
  };

  const cancelProcessing = () => {
    if (workerSupported && status === "processing") {
      const workerService = DocumentProcessorWorkerService.getInstance();
      workerService.cancelProcessing(documentId || "");
      setStatus("idle");
      setProgress(0);
      onProcessingProgress?.(0, "Processing cancelled");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="font-medium mb-2">Document Processing</h3>

      {status === "idle" && (
        <button
          onClick={() => processFile(file)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Process Document
        </button>
      )}

      {status === "processing" && (
        <div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {workerSupported
                ? "Processing in background..."
                : processingStatusMessage || "Processing..."}
            </p>
            {workerSupported && (
              <button
                onClick={cancelProcessing}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {status === "completed" && (
        <div className="text-green-600">
          Processing complete! The document is now searchable.
        </div>
      )}

      {status === "error" && (
        <div>
          <p className="text-red-600">Error processing document: {error}</p>
          <button
            onClick={() => processFile(file)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientDocumentProcessor;
