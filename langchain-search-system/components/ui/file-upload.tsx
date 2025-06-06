"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (
    file: File,
    onProgress: (progress: number) => void,
    abortSignal: AbortSignal
  ) => Promise<void>;
  supportedFormats?: string[];
  className?: string;
}

export function FileUpload({
  onUpload,
  supportedFormats = [".pdf", ".doc", ".docx", ".txt"],
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !supportedFormats.includes(`.${extension}`)) {
      setError(
        `Unsupported file format. Supported formats: ${supportedFormats.join(
          ", "
        )}`
      );
      return false;
    }
    return true;
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsUploading(false);
      setProgress(0);
      setError("Upload cancelled");
    }
  };

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;

    try {
      setIsUploading(true);
      setError(null);
      setProgress(0);
      abortControllerRef.current = new AbortController();

      await onUpload(
        file,
        (progress) => setProgress(progress),
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Upload cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Failed to upload file");
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleUpload(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
  };

  return (
    <Card className={cn("p-6", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center relative",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300",
          "transition-colors duration-200"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading && (
          <button
            onClick={handleCancel}
            className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full"
            title="Cancel upload"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="space-y-4">
          <div className="text-lg font-medium">
            {isUploading ? "Uploading..." : "Drag and drop your file here"}
          </div>
          <div className="text-sm text-gray-500">or</div>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
              accept={supportedFormats.join(",")}
              disabled={isUploading}
            />
            <Button
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isUploading}
            >
              Select File
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Supported formats: {supportedFormats.join(", ")}
          </div>
          {isUploading && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="text-sm text-gray-500">{progress}%</div>
            </div>
          )}
          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>
      </div>
    </Card>
  );
}
