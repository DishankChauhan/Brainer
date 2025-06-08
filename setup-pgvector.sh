#!/bin/bash

echo "🚀 Setting up pgvector for Brainer..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Remove old data to ensure clean setup
echo "🗑️  Removing old database data..."
docker volume rm brainer_postgres_data 2>/dev/null || true

# Start PostgreSQL with pgvector
echo "🐘 Starting PostgreSQL with pgvector..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is healthy
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U brainer -d brainer >/dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    echo "⏳ Attempt $attempt/$max_attempts - waiting for database..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Database failed to start after $max_attempts attempts"
    exit 1
fi

# Verify pgvector is working
echo "🔍 Verifying pgvector installation..."
docker-compose exec -T postgres psql -U brainer -d brainer -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"

# Test vector operations
echo "🧪 Testing vector operations..."
docker-compose exec -T postgres psql -U brainer -d brainer -c "SELECT '[1,2,3]'::vector <-> '[3,2,1]'::vector AS cosine_distance;"

# Run Prisma migrations
echo "📋 Running Prisma migrations..."
npx prisma db push

echo ""
echo "🎉 pgvector setup complete!"
echo ""
echo "Your database is now ready for semantic search with the following:"
echo "  • pgvector extension installed"
echo "  • Vector operators (<->, <#>, <+>) available" 
echo "  • Database schema updated"
echo ""
echo "You can now:"
echo "  • Upload voice notes and screenshots"
echo "  • Generate embeddings automatically"
echo "  • Use semantic search to find similar notes"
echo ""
echo "Database connection: postgresql://brainer:brainer_password_2024@localhost:5433/brainer" 