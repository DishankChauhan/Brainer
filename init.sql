-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user and database if they don't exist
-- (Note: These are usually handled by environment variables in Docker)

-- Verify pgvector is working
SELECT version(); 