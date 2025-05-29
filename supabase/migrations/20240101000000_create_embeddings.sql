-- Enable the vector extension
create extension if not exists vector;

create table embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  embedding vector(1536) not null,  -- Using text-embedding-3-small model instead
  created_at timestamp with time zone default now()
);

-- Create a vector index for the embedding column
create index on embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100); 