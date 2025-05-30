"use client";

import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/components/ui/use-toast";

export default function UploadPage() {
  const { toast } = useToast();

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

      // Set up progress tracking
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
      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          console.log("Upload response status:", xhr.status);
          console.log("Upload response:", xhr.responseText);

          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log("Upload successful:", data);
              toast({
                title: "Success",
                description:
                  data.message || "File uploaded and processed successfully.",
              });
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
      });
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
      </div>
    </div>
  );
}
