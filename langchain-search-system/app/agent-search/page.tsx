import { AgentSearch } from "@/app/components/AgentSearch";

export default function AgentSearchPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        AI-Powered Document Search
      </h1>
      <p className="text-center mb-8 max-w-3xl mx-auto text-gray-600">
        Ask questions about your documents or general knowledge. Our AI agent
        will search your uploaded documents and the web to find the most
        relevant information.
      </p>
      <AgentSearch />
    </div>
  );
}
