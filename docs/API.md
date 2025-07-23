# API Documentation

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

### POST /api/auth/login  
Authenticate user and receive JWT token.

## Case Management

### GET /api/cases
Retrieve paginated list of medical cases with filtering options.

### GET /api/cases/:id
Get detailed information about a specific case.

### POST /api/cases
Create a new medical case (requires instructor role).

## Simulation Engine

### POST /api/simulation/start/:caseId
Start a new simulation session for a case.

### POST /api/simulation/step/:sessionId
Process a simulation step and get the next step.

## Analytics

### GET /api/analytics/dashboard
Get user dashboard analytics and performance metrics.

### GET /api/analytics/competency/:userId
Get detailed competency assessment for a user.

For complete API documentation, visit `/api-docs` when the server is running.
