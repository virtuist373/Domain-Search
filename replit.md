# replit.md

## Overview

This is a web scraping application built with React frontend, Express backend, and PostgreSQL database using Drizzle ORM. The application allows users to perform site-specific searches by entering a domain and keywords, then scrapes search results using Puppeteer. It features a modern dark-themed UI built with shadcn/ui components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with a clear separation between client and server code:

- **Frontend**: React with TypeScript, Vite build system
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Web Scraping**: Puppeteer for automated browser interactions
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation

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

1. User submits search form with domain and keywords
2. Frontend validates input using Zod schema
3. API request sent to `/api/search` endpoint
4. Backend launches Puppeteer browser instance
5. Automated search performed on specified domain
6. Results extracted and stored in database
7. Search results returned to frontend
8. Results displayed in responsive card layout

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