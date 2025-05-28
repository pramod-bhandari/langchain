-- Enable the pgvector extension
create extension if not exists vector;

-- Create the match_documents function
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from documents d
  join embeddings e on d.id = e.document_id
  where 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$; 