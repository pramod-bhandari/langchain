import React, { useState } from "react";

const IndexPage: React.FC = () => {
  const [dataInput, setDataInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<
    { question: string; answer: string }[]
  >([]);

  // Placeholder: handle data submission
  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send dataInput to backend for embedding/storage
    setDataInput("");
  };

  // Placeholder: handle question submission
  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send question to backend, get answer
    const fakeAnswer = "This is a placeholder answer.";
    setAnswer(fakeAnswer);
    setHistory([...history, { question, answer: fakeAnswer }]);
    setQuestion("");
  };

  return (
    <div
      style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}
    >
      <h1>Langchain Q&A System</h1>
      <form onSubmit={handleDataSubmit} style={{ marginBottom: "1rem" }}>
        <textarea
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          placeholder="Paste data to store..."
          rows={4}
          style={{ width: "100%" }}
        />
        <button type="submit">Store Data</button>
      </form>
      <form onSubmit={handleQuestionSubmit} style={{ marginBottom: "1rem" }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          style={{ width: "80%" }}
        />
        <button type="submit">Ask</button>
      </form>
      {answer && (
        <div style={{ marginBottom: "1rem" }}>
          <strong>Answer:</strong> {answer}
        </div>
      )}
      <div>
        <h2>Chat History</h2>
        <ul>
          {history.map((item, idx) => (
            <li key={idx}>
              <strong>Q:</strong> {item.question} <br />
              <strong>A:</strong> {item.answer}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default IndexPage;
