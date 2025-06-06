"use client";

import { useState } from "react";
import { SearchInterface } from "@/components/ui/search-interface";
import { CoordinatorAgent } from "@/lib/agents/coordinator-agent";
import type { SearchResult, ConversationContext } from "@/app/types";

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const coordinator = new CoordinatorAgent();

  const handleSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const context: ConversationContext = {
        history: [],
        preferences: {},
      };

      const searchResults = await coordinator.coordinateSearch(query, context);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">
          Document Search System
        </h1>
        <SearchInterface
          onSearch={handleSearch}
          context={{
            history: [],
            preferences: {},
          }}
        />
        {isSearching && <div className="text-center">Searching...</div>}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Search Results</h2>
            {results.map((result, index) => (
              <div
                key={`${result.id}-${index}`}
                className="p-4 border rounded-lg"
              >
                <h3 className="font-medium">{result.metadata.title}</h3>
                <p className="text-sm text-gray-600">
                  {result.metadata.source}
                </p>
                <p className="mt-2">{result.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Score: {result.score.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
