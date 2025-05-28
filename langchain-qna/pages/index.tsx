import React, { useState } from "react";

const IndexPage: React.FC = () => {
  const [dataInput, setDataInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<
    { question: string; answer: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Send dataInput to backend for embedding/storage
    setDataInput("");
    setIsLoading(false);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Send question to backend, get answer
    const fakeAnswer = "This is a placeholder answer.";
    setAnswer(fakeAnswer);
    setHistory([...history, { question, answer: fakeAnswer }]);
    setQuestion("");
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        Langchain Q&A System
      </h1>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Add New Data</h2>
        <form onSubmit={handleDataSubmit}>
          <textarea
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            placeholder="Paste data to store..."
            style={{
              width: "100%",
              minHeight: "150px",
              marginBottom: "1rem",
              padding: "0.5rem",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {isLoading ? "Storing..." : "Store Data"}
          </button>
        </form>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Ask a Question</h2>
        <form onSubmit={handleQuestionSubmit}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              style={{ flex: 1, padding: "0.5rem" }}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {isLoading ? "Thinking..." : "Ask"}
            </button>
          </div>
        </form>
      </div>

      {answer && (
        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <h2>Answer</h2>
          <p>{answer}</p>
        </div>
      )}

      <div>
        <h2>Chat History</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {history.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: "1rem",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <p>
                <strong>Q:</strong> {item.question}
              </p>
              <p>
                <strong>A:</strong> {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
