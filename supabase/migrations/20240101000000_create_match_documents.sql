-- Enable the pgvector extension
create extension if not exists vector;

-- Drop existing function to avoid ambiguity
drop function if exists match_documents(vector, float, int);
drop function if exists match_documents(vector, float, int, int);

-- Create the match_documents function
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float default 0.5,  -- Lowered threshold for more matches
  match_count int default 5,
  match_min_length int default 10     -- Minimum content length to consider
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
  where 
    -- Ensure content is long enough to be meaningful
    length(d.content) >= match_min_length
    -- Use cosine similarity for better semantic matching
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by 
    -- Prioritize higher similarity matches
    e.embedding <=> query_embedding
  limit match_count;
end;
$$; 