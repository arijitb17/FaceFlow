# Overview

SmartAttend is an AI-powered classroom attendance system that uses facial recognition technology to automatically track student attendance. The application captures images from a webcam, processes them through machine learning models to identify students, and generates comprehensive attendance reports. It features a modern web interface built with React and TypeScript, with a Node.js/Express backend for API services and data management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API services
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints for students, classes, attendance sessions, and face recognition
- **File Structure**: Monorepo structure with shared schema definitions between client and server

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Centralized schema definitions in TypeScript with Zod validation
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Migration Strategy**: Drizzle Kit for database migrations and schema updates

## Face Recognition System
- **Processing**: Python-based face recognition using InsightFace library with ArcFace models
- **Training**: Support for student photo training with data augmentation
- **Recognition**: Real-time batch processing of webcam captures
- **Storage**: Face embeddings stored as JSON in PostgreSQL

## Development Environment
- **Package Management**: npm with lockfile for dependency consistency
- **Development Server**: Vite dev server with hot module replacement
- **TypeScript Configuration**: Shared tsconfig with path mapping for clean imports
- **Linting**: ESLint configuration for code quality

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **TypeScript**: Full TypeScript support with type definitions
- **Build Tools**: Vite, ESBuild for fast compilation and bundling

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Radix UI**: Headless UI components for accessibility and customization
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography

## Data Management
- **Database**: PostgreSQL via Neon Database serverless platform
- **ORM**: Drizzle ORM with PostgreSQL adapter for type-safe queries
- **Validation**: Zod for runtime type validation and schema generation
- **Query Management**: TanStack Query for server state and caching

## Face Recognition
- **Python Libraries**: InsightFace, OpenCV, NumPy for computer vision
- **Machine Learning**: ArcFace model for facial feature extraction
- **Image Processing**: PIL (Python Imaging Library) for image manipulation
- **Data Science**: scikit-learn for similarity calculations and analysis

## Development and Deployment
- **Process Management**: Child process spawning for Python script execution
- **Session Management**: Express sessions with PostgreSQL store
- **Environment**: Environment variable configuration for database and API keys
- **Development Tools**: tsx for TypeScript execution, Replit integration plugins