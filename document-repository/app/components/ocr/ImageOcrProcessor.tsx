"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { OcrProcessor } from "@/app/lib/processors/ocrProcessor";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Progress } from "@/app/components/ui/progress";
import { Loader2, Upload, Copy, Image as ImageIcon } from "lucide-react";

interface ImageOcrProcessorProps {
  onOcrComplete?: (text: string) => void;
}

export default function ImageOcrProcessor({
  onOcrComplete,
}: ImageOcrProcessorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrProcessor = useRef<OcrProcessor | null>(null);

  // Initialize OCR processor
  useEffect(() => {
    const initOcr = async () => {
      setIsLoading(true);
      try {
        ocrProcessor.current = OcrProcessor.getInstance();
        await ocrProcessor.current.initialize();
      } catch (error) {
        console.error("Failed to initialize OCR:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initOcr();

    // Cleanup
    return () => {
      if (ocrProcessor.current) {
        ocrProcessor.current.terminate().catch(console.error);
      }

      // Clear preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Clear previous results
      setExtractedText("");
      setConfidence(null);

      // Create preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);
    },
    [previewUrl]
  );

  const processImage = useCallback(async () => {
    if (!ocrProcessor.current) {
      console.error("OCR processor not initialized");
      return;
    }

    if (!fileInputRef.current?.files?.[0]) {
      console.error("No file selected");
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const file = fileInputRef.current.files[0];
      setProgress(30);

      // Process with OCR
      const result = await ocrProcessor.current.extractDetailed(file);
      setProgress(90);

      // Update UI with results
      setExtractedText(result.text);
      setConfidence(result.confidence);

      // Notify parent component
      if (onOcrComplete) {
        onOcrComplete(result.text);
      }
    } catch (error) {
      console.error("OCR processing failed:", error);
      setExtractedText(
        "Error processing image. Please try again with a clearer image."
      );
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [onOcrComplete]);

  const copyToClipboard = useCallback(() => {
    if (extractedText) {
      navigator.clipboard
        .writeText(extractedText)
        .then(() => {
          alert("Text copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy text:", err);
        });
    }
  }, [extractedText]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Image OCR Processor</CardTitle>
        <CardDescription>
          Extract text from images using OCR (Optical Character Recognition)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Initializing OCR engine...</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="image-upload">Upload Image</Label>
              <Input
                ref={fileInputRef}
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={triggerFileInput}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Image
                </Button>

                <Button
                  type="button"
                  onClick={processImage}
                  disabled={isProcessing || !previewUrl}
                  className="flex-1"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Extract Text"}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Processing Image</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {previewUrl && (
              <div className="border rounded-md p-2 mt-4">
                <div className="text-sm font-medium mb-2">Image Preview</div>
                <div className="flex justify-center">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {extractedText && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <Label htmlFor="extracted-text">Extracted Text</Label>
                  {confidence !== null && (
                    <span className="text-sm text-muted-foreground">
                      Confidence: {(confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Textarea
                    id="extracted-text"
                    value={extractedText}
                    readOnly
                    rows={8}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
