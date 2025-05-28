# Langchain.js + Next.js + Supabase Q&A System

## Overview
A Q&A system using Langchain.js for embeddings and LLM, Next.js for the frontend, and Supabase for storage. Supports text and (future) PDF input, semantic search, and chat history.

## Setup Instructions

### 1. Install dependencies
```
npm install
```

### 2. Environment variables
Create a `.env.local` file in the root directory:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
PORT=4000
```

### 3. Supabase setup
- Create a Supabase project at https://supabase.com
- Create tables: `documents`, `embeddings`, `qa_history`

### 4. Run the app
```
PORT=4000 npm run dev
```
Visit [http://localhost:4000](http://localhost:4000) to use your app.

---

Expand each module as needed for your use case!
