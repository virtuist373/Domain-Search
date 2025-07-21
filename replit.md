# replit.md

## Overview

This is a web scraping application built with React frontend, Express backend, and PostgreSQL database using Drizzle ORM. The application allows both anonymous and authenticated users to perform site-specific searches using domain and keywords via the Serper.dev API. Anonymous users can perform searches freely, while authenticated users benefit from search history persistence and CSV download functionality. It features a modern dark-themed UI built with shadcn/ui components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.
App architecture: Single-page application without routing flashes.

## System Architecture

The application follows a monorepo structure with a clear separation between client and server code:

- **Frontend**: React with TypeScript, Vite build system
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Web Scraping**: Puppeteer for automated browser interactions
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **External Integrations**: Natural Brand Placement Scout (ChatGPT custom GPT)

## Key Components

### Frontend Architecture
- **React Router**: Uses wouter for lightweight client-side routing
- **UI Components**: Comprehensive shadcn/ui component library with dark theme
- **Forms**: React Hook Form with Zod schema validation
- **API Client**: Custom query client with TanStack Query for data fetching
- **Styling**: Tailwind CSS with CSS variables for theming

### Backend Architecture
- **Express Server**: RESTful API with middleware for logging and error handling
- **Database Layer**: Drizzle ORM with PostgreSQL, configured for migrations
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development
- **Web Scraping**: Puppeteer integration for automated search result extraction

### Database Schema
- **Users Table**: Basic user management (id, username, password)
- **Search Results Table**: Stores scraped search data (domain, keyword, title, url, snippet, timestamp)

## Data Flow

1. User submits search form with domain and keywords (available for anonymous and authenticated users)
2. Frontend validates input using Zod schema
3. API request sent to `/api/search` endpoint with optional authentication
4. Backend performs search using Serper.dev API
5. For authenticated users: Results and search history are stored in database
6. For anonymous users: Results are returned without persistence
7. Search results displayed in responsive card layout with copy functionality
8. Premium features (CSV download, search history) require authentication
9. Brand Placement Scout integration allows users to analyze results for marketing opportunities

## Recent Changes

### Saved Searches (Favorite Searches) Implementation (July 21, 2025)
- ✓ Added savedSearches table to database schema with all advanced search parameters
- ✓ Created complete CRUD API endpoints for saved searches (/api/saved-searches)
- ✓ Implemented SavedSearches component with create, edit, delete, and load functionality
- ✓ Added integration between SavedSearches and AdvancedSearchForm components
- ✓ Enhanced AdvancedSearchForm to support loading saved search configurations
- ✓ Added real-time form data tracking for "Save Current" search functionality
- ✓ Implemented comprehensive error handling and user feedback for saved searches
- ✓ Feature restricted to authenticated users only with proper authorization
- ✓ Added UI for managing saved search library with search, edit, and quick-load options

### Advanced Search Query Logic Implementation (July 21, 2025)
- ✓ Enhanced schema to support advanced search operators (include, exclude, AND, OR, exact phrase, file type, date range)
- ✓ Created comprehensive query builder utility with Google search operator support
- ✓ Added advanced search API endpoint with query information response
- ✓ Implemented advanced search form component with collapsible options
- ✓ Updated UI to include both basic and advanced search tabs for authenticated and anonymous users
- ✓ Added query information display showing generated query, operators, and search description
- ✓ Integrated advanced search functionality with existing authentication and history system

### Brand Placement Scout Integration (July 18, 2025)
- Added external integration with Natural Brand Placement Scout (ChatGPT custom GPT)
- Implemented "Find Brand Placements" button in search results header
- Added copy URL functionality to each search result with one-click copying
- Created informational guides explaining how to use the brand placement tool
- Enhanced UI with tooltips and visual indicators for the brand placement workflow
- Feature available for both authenticated and anonymous users

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver for Neon
- **puppeteer**: Headless browser automation for web scraping
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form state management and validation
- **zod**: Runtime type validation and schema validation

### UI Dependencies
- **@radix-ui/***: Unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Utility for component variants

## Deployment Strategy

### Development
- **Vite Dev Server**: Hot module replacement for frontend development
- **tsx**: TypeScript execution for backend development
- **Replit Integration**: Custom plugins for Replit environment support

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild compiles TypeScript server to `dist/index.js`
- **Database**: Drizzle migrations manage schema changes
- **Environment**: Uses `DATABASE_URL` environment variable for PostgreSQL connection

### Key Configuration Files
- **drizzle.config.ts**: Database configuration and migration settings
- **vite.config.ts**: Frontend build configuration with path aliases
- **tsconfig.json**: TypeScript configuration for monorepo structure
- **tailwind.config.ts**: Styling configuration with custom theme variables

The application is designed to be deployed on platforms supporting Node.js with PostgreSQL database connectivity, with specific optimizations for the Replit environment.