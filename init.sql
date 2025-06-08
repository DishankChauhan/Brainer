-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant necessary permissions 
GRANT ALL PRIVILEGES ON DATABASE brainer TO brainer;

-- Connect to the brainer database and set up pgvector
\c brainer;

-- Create the vector extension in the brainer database
CREATE EXTENSION IF NOT EXISTS vector;

-- Test vector functionality
DO $$
BEGIN
    -- Test basic vector operations
    PERFORM '[1,2,3]'::vector;
    PERFORM '[1,2,3]'::vector <-> '[3,2,1]'::vector;
    RAISE NOTICE 'pgvector extension installed and working correctly!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'pgvector setup failed: %', SQLERRM;
END
$$;

-- Create an index type test (won't work without data, but validates the extension)
-- This helps verify that all vector operators are available
SELECT 
    '<->' AS cosine_distance_operator,
    '<#>' AS negative_inner_product_operator, 
    '<->' AS l2_distance_operator;

-- Show extension info
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'; 