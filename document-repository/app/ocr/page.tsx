"use client";

import ImageOcrProcessor from "@/app/components/ocr/ImageOcrProcessor";

export default function OcrPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">OCR Image Processing</h1>
        <p className="text-muted-foreground">
          Upload an image containing text to extract its contents using Optical
          Character Recognition (OCR). This feature uses Tesseract.js for
          client-side text extraction.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">How it works</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Upload an image containing text (photo, screenshot, scanned
            document, etc.)
          </li>
          <li>The system processes the image using Tesseract OCR technology</li>
          <li>Extracted text appears below and can be copied to clipboard</li>
          <li>
            The extracted text can be used in your document repository for
            analysis
          </li>
        </ol>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tips for best results</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Use clear, high-resolution images</li>
          <li>Ensure good lighting and contrast between text and background</li>
          <li>Avoid skewed or rotated text</li>
          <li>Simple fonts work better than decorative or stylized text</li>
        </ul>
      </div>

      <ImageOcrProcessor
        onOcrComplete={(text) => {
          console.log(
            "OCR processing completed with text length:",
            text.length
          );
        }}
      />
    </div>
  );
}
