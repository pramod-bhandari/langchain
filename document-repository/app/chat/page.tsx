"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import VoiceInput from "../components/voice-input/VoiceInput";
import ConversationHistory from "../components/chat/ConversationHistory";
import { useConversationStore } from "../store/conversationStore";
import { useDocumentStore } from "../store/documentStore";
import { Message } from "../lib/memory/conversationMemory";
import ClientDocumentProcessor from "../components/document-processing/ClientDocumentProcessor";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");

  // Zustand store hooks
  const {
    fetchConversations,
    createConversation,
    addMessage,
    getCurrentConversation,
    currentConversationId,
  } = useConversationStore();

  const { fetchDocument, currentDocument } = useDocumentStore();

  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState<string>("");
  const [docDescription, setDocDescription] = useState<string>("");
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [useClientProcessor, setUseClientProcessor] = useState<boolean>(false);

  // Load conversations and handle document parameter
  useEffect(() => {
    fetchConversations();

    if (documentId) {
      fetchDocument(documentId);
    }
  }, [fetchConversations, documentId, fetchDocument]);

  // Create a new conversation with document if needed
  useEffect(() => {
    const initConversation = async () => {
      if (documentId && currentDocument && !currentConversationId) {
        // Create a conversation with the document
        await createConversation(`Chat with ${currentDocument.title}`);
      } else if (!currentConversationId) {
        // Create a default conversation if none exists
        await createConversation();
      }
    };

    initConversation();
  }, [documentId, currentDocument, currentConversationId, createConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [getCurrentConversation()?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setError(null);
    setErrorDetails(null);

    // Add user message to chat
    addMessage("user", userMessage);

    try {
      setIsLoading(true);

      const currentConversation = getCurrentConversation();

      if (!currentConversation) {
        throw new Error("No active conversation");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessage,
          conversationId: currentConversation.id,
          // Get document info from context if available
          documentIds: currentConversation.context?.recentDocuments || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      // Add assistant response to chat
      addMessage("assistant", data.answer);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setInput(transcript);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    // Check if this is an image file that needs client-side processing
    if (selectedFile) {
      // Auto-populate the title with filename without extension
      const fileName = selectedFile.name;
      const titleFromName = fileName.split(".").slice(0, -1).join(".");
      setDocTitle(titleFromName);

      const isImage = selectedFile.type.startsWith("image/");
      setUseClientProcessor(isImage);
    } else {
      setUseClientProcessor(false);
    }
  };

  // Handle client processor progress updates
  const handleClientProcessingProgress = (
    progress: number,
    message: string
  ) => {
    console.log(`OCR Progress: ${progress}%, Message: ${message}`);
    // Force a progress update even for 0% to show the progress bar
    if (progress === 0) progress = 1;
    setUploadProgress(progress);
    setUploadStatus(message);

    // Update the UI to show we're still processing
    setIsUploading(true);
  };

  // Handle client processor completion
  const handleClientProcessingComplete = (data: unknown) => {
    console.log("OCR Processing Complete:", data);
    if (data && typeof data === "object" && "id" in data) {
      setIsUploading(false);
      toggleUploadModal();
      addMessage("assistant", `Uploaded document: ${docTitle || file?.name}`);
      addMessage(
        "assistant",
        "Document has been processed and is ready for querying."
      );
    } else {
      setError("OCR processing completed but no document ID was returned");
      console.error("OCR processing completed but data invalid:", data);
      setIsUploading(false);
    }
  };

  const toggleUploadModal = () => {
    setShowUploadModal(!showUploadModal);
    if (!showUploadModal) {
      setFile(null);
      setDocTitle("");
      setDocDescription("");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Check if this is an image file
    const isImage = file.type.startsWith("image/");

    // If it's an image, we'll use the client processor
    if (isImage) {
      setIsUploading(true);
      setUseClientProcessor(true);
      return; // The ClientDocumentProcessor component will handle the rest
    }

    // For non-image files, use the existing flow
    try {
      setIsUploading(true);
      setError(null);
      setErrorDetails(null);

      // Try client-side extraction first
      let extractedText = null;
      let extractedChunks = null;
      let extractionMetadata = null;

      // Import dynamically to prevent server-side issues
      const { extractTextFromFile } = await import(
        "@/app/lib/client/documentExtractor"
      );

      try {
        // Show extraction status
        setIsUploading(true);
        setUploadStatus("Extracting text from document...");

        // Perform client-side extraction
        const extractionResult = await extractTextFromFile(
          file,
          (progress, status) => {
            setUploadProgress(progress);
            setUploadStatus(status);
          }
        );

        if (extractionResult) {
          console.log(
            "Client-side extraction successful:",
            extractionResult.metadata
          );
          extractedText = extractionResult.text;
          extractedChunks = extractionResult.chunks;
          extractionMetadata = extractionResult.metadata;

          setUploadStatus(
            `Extracted ${extractionResult.metadata.wordCount} words. Uploading...`
          );
        } else {
          console.log(
            "Client-side extraction not possible, using server-side extraction"
          );
          setUploadStatus("Server-side extraction will be used");
        }
      } catch (extractError) {
        console.warn("Client-side extraction failed:", extractError);
        // Continue with upload, server will handle extraction
        setUploadStatus("Using server-side extraction");
      }

      // Create form data with extracted text if available
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", docTitle || file.name);

      if (docDescription) {
        formData.append("description", docDescription);
      }

      // Add extracted text if available
      if (extractedText && extractedChunks) {
        formData.append("extractedText", extractedText);
        formData.append("extractedChunks", JSON.stringify(extractedChunks));
        formData.append(
          "extractionMetadata",
          JSON.stringify(extractionMetadata)
        );
      }

      setUploadStatus("Uploading to server...");
      setUploadProgress(extractedText ? 80 : 50);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      // First check if the response is OK
      if (!response.ok) {
        let errorMessage = `Upload failed with status: ${response.status}`;
        let errorDetails = null;

        // Try to get detailed error information
        let errorBody = null;
        try {
          errorBody = await response.json();
          if (errorBody && errorBody.error) {
            errorMessage = errorBody.error;
            if (errorBody.details) {
              errorDetails = errorBody.details;
            }
          }
        } catch {
          // If JSON parsing fails, try to get the text content
          try {
            const textContent = await response.text();
            if (textContent) {
              errorMessage = textContent;
            }
          } catch {
            // If all else fails, stick with the default error message
          }
        }

        setError(errorMessage);
        if (errorDetails) setErrorDetails(errorDetails);
        throw new Error(errorMessage);
      }

      // Parse the successful response
      const data = await response.json();

      setUploadProgress(100);
      setUploadStatus("Upload complete!");

      // Add message about the upload
      addMessage("assistant", `Uploaded document: ${data.title}`);

      // Close the modal
      toggleUploadModal();

      // If the document is already processed (client-side extraction), show completion message
      if (data.status === "completed") {
        addMessage(
          "assistant",
          "Document has been processed and is ready for querying."
        );
      } else {
        // Otherwise poll for processing status
        pollDocumentStatus(data.id);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to upload document"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const pollDocumentStatus = async (docId: string) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3s = 60 seconds max
    const pollInterval = 3000; // 3 seconds

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/documents/status?id=${docId}`);
        if (!response.ok) throw new Error("Failed to check document status");

        const data = await response.json();

        if (data.status === "processed") {
          addMessage(
            "assistant",
            "Document has been processed and is ready for querying."
          );
          return true;
        } else if (data.status === "failed") {
          addMessage(
            "assistant",
            "There was an error processing the document. It might not be fully queryable."
          );
          return true;
        }
      } catch (error) {
        console.error("Status check error:", error);
      }

      attempts++;
      if (attempts >= maxAttempts) {
        addMessage(
          "assistant",
          "Document processing is taking longer than expected. You can still try querying it."
        );
        return true;
      }

      return false;
    };

    const poll = async () => {
      const isDone = await checkStatus();
      if (!isDone) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);
  };

  const conversation = getCurrentConversation();
  const messages: Message[] = conversation?.messages || [];

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 flex">
        {/* Sidebar / Conversation History */}
        <div
          className={`fixed inset-y-0 left-0 w-80 bg-white border-r border-gray-200 shadow-md transform transition-transform z-50 
            ${
              showSidebar ? "translate-x-0" : "-translate-x-full"
            } md:relative md:translate-x-0`}
        >
          <ConversationHistory onClose={() => setShowSidebar(false)} />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700"
              >
                ☰
              </button>
              <h1 className="text-2xl font-bold">
                {conversation?.title || "Chat with Documents"}
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/documents"
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
              >
                Documents
              </Link>
              <Link
                href="/"
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
              >
                Home
              </Link>
            </div>
          </div>

          {/* Messages container */}
          <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-2 text-xl">👋 Welcome to Document Chat</p>
                <p>
                  Upload documents using the paperclip button and then ask
                  questions about them.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.id}-${index}`}
                  className={`mb-4 ${
                    message.role === "user"
                      ? "bg-blue-100 ml-auto mr-0 rounded-lg p-3 max-w-[80%]"
                      : message.role === "assistant" &&
                        (message.content.startsWith("Uploaded document:") ||
                          message.content ===
                            "Document has been processed and is ready for querying." ||
                          message.content ===
                            "There was an error processing the document. It might not be fully queryable." ||
                          message.content ===
                            "Document processing is taking longer than expected. You can still try querying it.")
                      ? "bg-gray-200 mx-auto rounded-lg p-2 max-w-[90%] text-center text-sm"
                      : "bg-white border border-gray-200 mr-auto ml-0 rounded-lg p-3 max-w-[80%]"
                  }`}
                >
                  {!message.content.startsWith("Uploaded document:") &&
                    message.content !==
                      "Document has been processed and is ready for querying." &&
                    message.content !==
                      "There was an error processing the document. It might not be fully queryable." &&
                    message.content !==
                      "Document processing is taking longer than expected. You can still try querying it." && (
                      <div className="text-sm font-semibold mb-1">
                        {message.role === "user" ? "You" : "Assistant"}
                      </div>
                    )}
                  <div>{message.content}</div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="bg-white border border-gray-200 mr-auto ml-0 rounded-lg p-3 max-w-[80%]">
                <div className="text-sm font-semibold mb-1">Assistant</div>
                <div className="flex items-center">
                  <span className="mr-2">Thinking</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                <div className="font-semibold mb-1">Error: {error}</div>
                {errorDetails && (
                  <div className="text-sm mt-2 p-2 bg-white rounded border border-red-100">
                    <p className="font-medium mb-1">Instructions:</p>
                    <p>{errorDetails}</p>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className="flex flex-col gap-2">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your documents..."
                className="flex-1 p-3 border border-gray-300 rounded-lg"
                disabled={isLoading || isUploading}
              />
              <VoiceInput
                onTranscript={handleVoiceInput}
                disabled={isLoading || isUploading}
              />
              <button
                type="button"
                onClick={toggleUploadModal}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-100"
                title="Upload Document"
                disabled={isLoading || isUploading}
              >
                📎
              </button>
              <button
                type="submit"
                disabled={isLoading || isUploading || !input.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
            <div className="text-xs text-gray-500 ml-2">
              <p>
                💡 <span className="font-medium">Pro tip:</span> Click on the 🎤
                icon to use voice input for your questions!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Upload Document</h3>
              <button
                onClick={toggleUploadModal}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Enter document title or leave blank to use filename"
                  className="w-full p-2 text-sm border border-gray-300 rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If left blank, the document name will be used as the title
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Enter a brief description of the document"
                  className="w-full p-2 text-sm border border-gray-300 rounded"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Document
                </label>
                <div
                  onClick={handleFileSelect}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
                >
                  {file ? (
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      {useClientProcessor && (
                        <p className="text-xs text-blue-600 mt-1">
                          Will be processed with client-side OCR
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm">Click to select a file</p>
                      <p className="text-xs text-gray-500">
                        PDF, DOCX, TXT, Images (JPG, PNG), etc.
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.tiff"
                />
              </div>

              {useClientProcessor && isUploading ? (
                <div className="mt-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {uploadStatus || "Processing image..."}
                      </span>
                      <span className="text-xs text-gray-500">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs mt-2 text-gray-500">
                      Client-side OCR processing may take several moments
                    </p>
                  </div>

                  <div>
                    <ClientDocumentProcessor
                      file={file!}
                      onProcessingProgress={handleClientProcessingProgress}
                      onProcessingComplete={handleClientProcessingComplete}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={toggleUploadModal}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!file || isUploading}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Processing..." : "Upload"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
