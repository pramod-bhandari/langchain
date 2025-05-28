create table embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  embedding vector(3072) not null,
  created_at timestamp with time zone default now()
); 