"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SearchInterfaceProps } from "@/app/types";

export function SearchInterface({
  onSearch,
  context,
  className,
}: SearchInterfaceProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await onSearch(query);
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto p-6", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Enter your search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
        <Button type="submit" className="w-full">
          Search
        </Button>
      </form>
    </Card>
  );
}
