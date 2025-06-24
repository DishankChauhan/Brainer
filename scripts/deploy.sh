#!/bin/bash

# 🚀 Brainer Deployment Script
# This script helps deploy the Brainer app to various platforms

set -e  # Exit on any error

echo "🧠 Brainer Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Copying from env.example..."
    if [ -f "env.example" ]; then
        cp env.example .env.local
        print_warning "Please edit .env.local with your actual environment variables before deploying."
    else
        print_error "env.example not found. Please create .env.local manually."
        exit 1
    fi
fi

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    npx prisma generate
    npx prisma migrate deploy
    print_success "Database migrations completed"
}

# Function to build the application
build_application() {
    print_status "Building application..."
    npm run build
    print_success "Application built successfully"
}

# Function to test the build
test_build() {
    print_status "Testing the build..."
    npm run start &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Check if server is responding
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Build test passed"
    else
        print_error "Build test failed - server not responding"
        kill $SERVER_PID
        exit 1
    fi
    
    # Kill the test server
    kill $SERVER_PID
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to production
    vercel --prod
    print_success "Deployed to Vercel successfully"
}

# Function to deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway..."
    
    if ! command -v railway &> /dev/null; then
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    railway up
    print_success "Deployed to Railway successfully"
}

# Function to build Docker image
build_docker() {
    print_status "Building Docker image..."
    docker build -t brainer:latest .
    print_success "Docker image built successfully"
}

# Main deployment function
deploy() {
    local platform=$1
    
    print_status "Starting deployment to $platform..."
    
    # Run common steps
    check_prerequisites
    install_dependencies
    run_migrations
    build_application
    
    # Platform-specific deployment
    case $platform in
        "vercel")
            deploy_vercel
            ;;
        "railway")
            deploy_railway
            ;;
        "docker")
            build_docker
            ;;
        *)
            print_error "Unknown platform: $platform"
            print_status "Supported platforms: vercel, railway, docker"
            exit 1
            ;;
    esac
    
    print_success "🎉 Deployment to $platform completed successfully!"
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <platform>"
    echo ""
    echo "Supported platforms:"
    echo "  vercel   - Deploy to Vercel"
    echo "  railway  - Deploy to Railway"
    echo "  docker   - Build Docker image"
    echo ""
    echo "Examples:"
    echo "  $0 vercel"
    echo "  $0 railway"
    echo "  $0 docker"
    exit 1
fi

# Run deployment
deploy $1 