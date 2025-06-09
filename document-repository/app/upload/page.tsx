"use client";

import { useState } from "react";
import FileUploadProcessor from "../components/FileUploadProcessor";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const [uploadComplete, setUploadComplete] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId);
    setUploadComplete(true);

    // Auto-navigate to chat after a short delay
    setTimeout(() => {
      router.push("/chat");
    }, 2000);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Document Upload</h1>
          <p className="text-gray-600 mb-2">
            Upload documents to process with OCR and make them searchable.
            Supports PDF, Word, Excel, Text, and Image files.
          </p>
          <p className="text-sm text-blue-600">
            <span className="font-medium">✨ Enhanced Upload:</span> Supports
            client-side OCR for images and text extraction from PDF/DOCX files.
          </p>
        </div>

        <FileUploadProcessor
          onUploadComplete={handleUploadComplete}
          showSettings={true}
        />

        {uploadComplete && documentId && (
          <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg">
            <h3 className="font-medium mb-2">Upload Complete!</h3>
            <p>Your document has been processed and is ready for searching.</p>
            <div className="mt-4">
              <Link
                href="/chat"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Go to Chat Interface
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
