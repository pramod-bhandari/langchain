# Document Repository & AI Chat

A modern document management system with AI-powered chat capabilities. This application allows users to upload documents, organize them, add annotations, and have conversations with their documents using advanced AI.

## Features

- **Document Management**
  - Upload and store various document types (PDF, DOCX, TXT, images, etc.)
  - Browse, view, and manage documents
  - Document metadata and status tracking
  - Document viewer with support for different file types

- **AI Chat Interface**
  - Chat with documents using natural language
  - Multi-document search capabilities
  - Voice input for questions
  - Conversation history and management

- **Advanced Processing**
  - Vector embeddings for semantic search
  - OCR for image-based documents
  - Text chunking for better processing
  - Background processing of uploaded documents

- **Annotations & Collaboration**
  - Add notes and annotations to documents
  - Track document processing status
  - Share documents with direct links

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database & Storage**: Supabase (PostgreSQL + Storage)
- **AI & ML**: LangChain, OpenAI, Tesseract.js (OCR)
- **State Management**: Zustand
- **Voice Input**: Web Speech API

## Getting Started

### Prerequisites

- Node.js (v18+)
- NPM or Yarn
- Supabase account
- OpenAI API key

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Optional - Vector store settings
VECTOR_STORE_SIMILARITY_THRESHOLD=0.7
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Supabase Setup

1. Create a new Supabase project
2. Set up the following tables:
   - `documents` - For document metadata
   - `chunks` - For text chunks with vector embeddings
   - `annotations` - For document annotations
3. Enable vector extension in Supabase SQL editor:
   ```sql
   -- Enable the pgvector extension
   create extension vector;

   -- Create tables with appropriate columns including vector columns
   ```

### Storage Bucket Setup

To store and manage document files, you need to set up a Supabase storage bucket:

1. Log in to your Supabase dashboard
2. Navigate to "Storage" in the left sidebar
3. Click "New Bucket"
4. Name the bucket "documents" (must be exactly this name)
5. Choose the appropriate access level:
   - For public access: Check "Public bucket" (easiest for testing)
   - For private access: Leave "Public bucket" unchecked (more secure)
6. Click "Create bucket"

If you choose a private bucket, you'll need to set up Row Level Security (RLS) policies to control access.

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Usage

1. **Home Page**: Navigate to the main features
2. **Chat**: Upload documents and ask questions about them
3. **Documents**: Browse and manage your uploaded documents
4. **Document Viewer**: View documents and add annotations

## Key Components

- `DocumentViewer`: Renders different document types
- `AnnotationSystem`: Manages document annotations
- `VoiceInput`: Handles voice-to-text input
- `ConversationHistory`: Manages chat history
- Text processing pipeline: Extraction → Chunking → Embedding → Storage
- Client-side document processing:
  - PDF.js integration: Extracts text from PDFs directly in the browser
  - Mammoth.js integration: Extracts text from DOCX files
  - XLSX.js integration: Extracts text from Excel spreadsheets
- Vercel-friendly architecture with client-side processing for large files

## License

MIT

## Acknowledgments

- LangChain for the AI tools and abstractions
- Supabase for the backend infrastructure
- OpenAI for the language models
- Tesseract.js for OCR capabilities
