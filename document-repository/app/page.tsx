import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Document Repository & <span className="text-blue-600">AI Chat</span>
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Upload documents, search with AI, and collaborate with
            document-based conversations
          </p>
        </div>

        <div className="mb-10 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-1">
              New
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Progressive Document Loading
            </h2>
            <p className="text-gray-600 text-sm">
              View large documents faster with progressive loading and streaming
            </p>
          </div>
          <Link
            href="/progressive-viewer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try It Now
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Document Repository
            </h2>
            <p className="text-gray-600 mb-4">
              Upload, view, and manage your documents. Add annotations and
              collaborate with others.
            </p>
            <div className="flex justify-between items-center">
              <Link
                href="/documents"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Browse Documents
              </Link>
              <span className="text-3xl">📚</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              AI Chat
            </h2>
            <p className="text-gray-600 mb-4">
              Chat with your documents using AI. Ask questions, get summaries,
              and extract insights.
            </p>
            <div className="flex justify-between items-center">
              <Link
                href="/chat"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Start Chatting
              </Link>
              <span className="text-3xl">💬</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Progressive Viewer
            </h2>
            <p className="text-gray-600 mb-4">
              Experience faster viewing of large documents with streaming
              technology.
            </p>
            <div className="flex justify-between items-center">
              <Link
                href="/progressive-viewer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                View Documents
              </Link>
              <span className="text-3xl">📄</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">🔍</span>
              <h3 className="text-lg font-medium text-gray-900">
                Vector Search
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              AI-powered semantic search to find information across all your
              documents
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">🔊</span>
              <h3 className="text-lg font-medium text-gray-900">Voice Input</h3>
            </div>
            <p className="text-sm text-gray-600">
              Speak your questions directly to the AI assistant for a hands-free
              experience
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">⚡</span>
              <h3 className="text-lg font-medium text-gray-900">
                Fast Loading
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Progressive document streaming for instant previews and better
              user experience
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📷</span>
              <h3 className="text-lg font-medium text-gray-900">
                OCR Technology
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              Extract text from images and scanned documents to make them
              searchable
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by Next.js, LangChain, OpenAI, and Supabase</p>
        </div>
      </div>
    </main>
  );
}
