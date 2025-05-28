import React, { useState, useEffect } from "react";
import { storeTextWithEmbedding } from "@/lib/embeddings";

interface QARecord {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export default function Home() {
  if (process.env.NODE_ENV === "development") {
    console.log("Environment Variables Check:");
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("OPENAI_MODEL_NAME:", process.env.OPENAI_MODEL_NAME);
    console.log("OPENAI_EMBEDDING_MODEL:", process.env.OPENAI_EMBEDDING_MODEL);
    console.log(
      "NEXT_PUBLIC_SUPABASE_URL exists:",
      !!process.env.NEXT_PUBLIC_SUPABASE_URL
    );
    console.log(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY exists:",
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  const [dataInput, setDataInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isStoring, setIsStoring] = useState(false);
  const [history, setHistory] = useState<QARecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInput.trim()) return;

    setIsStoring(true);
    setError("");

    try {
      const response = await fetch("/api/store-embedding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: dataInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to store data");
      }

      const result = await response.json();
      console.log("Stored successfully:", result);
      setDataInput("");
    } catch (error) {
      console.error("Error storing data:", error);
      setError(error instanceof Error ? error.message : "Failed to store data");
    } finally {
      setIsStoring(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get answer");
      }

      const data = await response.json();
      setAnswer(data.answer);
      setQuestion("");
      // Refresh history after new Q&A
      fetchHistory();
    } catch (error) {
      console.error("Error getting answer:", error);
      setError(error instanceof Error ? error.message : "Failed to get answer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        LangChain Q&A
      </h1>

      <div style={{ display: "flex", gap: "40px" }}>
        {/* Left side: Input forms */}
        <div style={{ flex: 1 }}>
          {/* Data Input Form */}
          <div style={{ marginBottom: "40px" }}>
            <h2>Store New Data</h2>
            <form onSubmit={handleDataSubmit}>
              <textarea
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                placeholder="Enter text to store..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  marginBottom: "10px",
                  padding: "10px",
                }}
              />
              <button
                type="submit"
                disabled={isStoring}
                style={{
                  padding: "10px 20px",
                  backgroundColor: isStoring ? "#ccc" : "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: isStoring ? "not-allowed" : "pointer",
                }}
              >
                {isStoring ? "Storing..." : "Store Data"}
              </button>
            </form>
          </div>

          {/* Q&A Form */}
          <div>
            <h2>Ask a Question</h2>
            <form onSubmit={handleQuestionSubmit}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question..."
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "10px 20px",
                  backgroundColor: isLoading ? "#ccc" : "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Thinking..." : "Ask"}
              </button>
            </form>

            {error && (
              <div
                style={{
                  color: "red",
                  marginTop: "10px",
                  padding: "10px",
                  backgroundColor: "#ffebee",
                  borderRadius: "5px",
                }}
              >
                {error}
              </div>
            )}

            {answer && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "5px",
                }}
              >
                <h3>Answer:</h3>
                <p>{answer}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: History */}
        <div style={{ flex: 1 }}>
          <h2>Q&A History</h2>
          {isLoadingHistory ? (
            <div>Loading history...</div>
          ) : history.length === 0 ? (
            <div>No history yet</div>
          ) : (
            <div style={{ maxHeight: "800px", overflowY: "auto" }}>
              {history.map((record) => (
                <div
                  key={record.id}
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "5px",
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Q:</strong> {record.question}
                  </div>
                  <div>
                    <strong>A:</strong> {record.answer}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8em",
                      color: "#666",
                      marginTop: "5px",
                    }}
                  >
                    {new Date(record.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
