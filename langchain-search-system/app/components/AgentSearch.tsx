"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import type { SearchResult, ConversationContext } from "@/app/types";

export function AgentSearch() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>(
    []
  );
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSearchStatus("Searching your documents and the web...");

    try {
      // Add user message to history
      const updatedHistory = [...history, { role: "user", content: query }];
      setHistory(updatedHistory);

      // Create context object
      const context: ConversationContext = {
        history: updatedHistory,
      };

      // Call the agent API
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, context }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Search request failed");
      }

      const data = await response.json();
      setResults(data.results);

      // Add assistant response to history
      if (data.results && data.results.length > 0) {
        const sourceInfo = data.results[0].metadata?.source
          ? `\n\nSource: ${data.results[0].metadata.source}`
          : "";

        setHistory([
          ...updatedHistory,
          {
            role: "assistant",
            content: data.results[0].content + sourceInfo,
          },
        ]);
      }
    } catch (error) {
      console.error("Error in agent search:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during search",
        variant: "destructive",
      });

      // Add error message to chat history
      setHistory([
        ...history,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error while searching. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setSearchStatus(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex gap-2 mb-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your documents or general knowledge..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSearch()}
          disabled={isLoading}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {searchStatus && (
        <div className="p-4 mb-4 bg-blue-50 text-blue-700 rounded-lg">
          {searchStatus}
        </div>
      )}

      {/* Chat history display */}
      <div className="space-y-4 mb-6">
        {history.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`p-4 rounded-lg ${
              message.role === "user"
                ? "bg-blue-100 ml-12"
                : "bg-gray-100 mr-12"
            }`}
          >
            <p className="text-sm font-semibold mb-1">
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && history.length > 0 && (
        <div className="p-4 rounded-lg bg-gray-100 mr-12 animate-pulse">
          <p className="text-sm font-semibold mb-1">Assistant</p>
          <p>Thinking...</p>
        </div>
      )}

      {/* Results display (if not showing in chat) */}
      {results.length > 0 && history.length === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Search Results</h2>
          {results.map((result, index) => (
            <div
              key={`${result.id}-${index}`}
              className="p-4 border rounded-lg"
            >
              <p className="whitespace-pre-wrap">{result.content}</p>
              {result.metadata && (
                <p className="text-sm text-gray-500 mt-2">
                  Source: {result.metadata.source || "Unknown"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
