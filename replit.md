# Speech Access Map

## Overview

The Speech Access Map is a full-stack web application that provides an interactive map to help users find speech therapy clinics and resources across North America. The application features real-time data visualization, comprehensive search and filtering capabilities, and machine learning-powered insights for optimal clinic placement and coverage analysis.

## User Preferences

Preferred communication style: Simple, everyday language.
Deployment priority: High - User needs continuous uptime for NSA public website
Data integrity requirement: Must use only authentic, verifiable healthcare provider data

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (via Neon serverless)
- **External APIs**: 
  - NPI (National Provider Identifier) database for healthcare provider data
  - Nominatim geocoding service for location data
  - Clinical Tables API for medical provider lookups

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**: 
  - `clinics` - Core speech therapy provider data
  - `submissions` - User-submitted clinic information
  - `analytics` - Application usage metrics
  - `users` - Basic user management

## Key Components

### Interactive Map System
- **Technology**: Leaflet.js for map rendering and interaction
- **Features**: 
  - Marker clustering for performance with large datasets
  - Real-time filtering and search
  - Custom icons for different clinic types
  - Responsive design for mobile and desktop

### Data Import and Enhancement System
- **NPI Integration**: Automated import of verified healthcare providers
- **Geocoding Service**: Converts addresses to precise coordinates
- **Data Validation**: ML-powered data cleaning and standardization
- **Coverage Analysis**: Geospatial optimization for identifying service gaps

### Machine Learning Insights
- **Geospatial Optimizer**: Analyzes clinic coverage and identifies optimal placement locations
- **Data Enhancer**: Standardizes and enriches clinic information
- **Analytics Engine**: Provides insights on usage patterns and service gaps

### User Interface Components
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Accessibility**: ARIA compliance and keyboard navigation support
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Performance**: Lazy loading and code splitting for optimal load times

## Data Flow

1. **Data Ingestion**: 
   - Import from NPI database using multiple search strategies
   - Geocode addresses using Nominatim API
   - Validate and clean data using ML algorithms

2. **Data Processing**:
   - Store in PostgreSQL with proper indexing
   - Generate analytics and insights
   - Update coverage analysis in real-time

3. **Client Interaction**:
   - Fetch data via REST API endpoints
   - Cache responses using React Query
   - Update UI reactively based on user interactions

4. **Real-time Updates**:
   - Server-side data processing for new submissions
   - Client-side state updates without page refresh
   - Optimistic updates for better user experience

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **leaflet**: Interactive mapping functionality
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **tsx**: TypeScript execution for development
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **drizzle-kit**: Database schema management

### External APIs
- **NPI Registry**: Healthcare provider database
- **Nominatim**: Open-source geocoding service
- **Clinical Tables**: Medical provider lookup service

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets
- **Backend**: esbuild bundles server code for production
- **Database**: Drizzle migrations handle schema updates

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Serverless deployment with environment variables
- **Database**: Neon PostgreSQL with connection pooling

### Performance Optimization
- **Asset Optimization**: Compressed images and minified code
- **Caching Strategy**: Browser caching for static assets
- **Database Optimization**: Indexed queries and connection pooling
- **CDN Integration**: Static asset delivery optimization

### Security Considerations
- **Input Validation**: Zod schemas for all API inputs
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Secure handling of sensitive data
- **Rate Limiting**: API endpoint protection

The application follows modern full-stack development practices with emphasis on type safety, performance, and user experience. The architecture supports both real-time data updates and offline functionality while maintaining scalability for growing datasets.