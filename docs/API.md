# Medical Case Simulator API Documentation

## Overview

The Medical Case Simulator API provides a comprehensive backend for medical education platforms, featuring interactive case simulations, real-time collaboration, and advanced analytics.

**Base URL:** `https://your-domain.com/api`  
**Version:** 1.0.0  
**Authentication:** Bearer Token (JWT)

## Quick Start

### 1. Authentication

All API requests (except registration and login) require authentication using JWT tokens.

```bash
# Login to get access token
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Making Authenticated Requests

Include the access token in the Authorization header:

```bash
curl -X GET https://your-domain.com/api/cases \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Authentication Endpoints

### Register User
**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "SecurePass123",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "institution": "Medical University",
    "specialty": "Internal Medicine",
    "yearOfStudy": 3
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "student@university.edu",
    "profile": { ... },
    "role": "student"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Login
**POST** `/api/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "SecurePass123"
}
```

### Get Profile
**GET** `/api/auth/profile`

Get current user's profile information.

**Headers:** `Authorization: Bearer TOKEN`

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "email": "student@university.edu",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "institution": "Medical University",
    "specialty": "Internal Medicine",
    "yearOfStudy": 3
  },
  "role": "student",
  "statistics": {
    "casesCompleted": 15,
    "averageScore": 85.5,
    "totalTimeSpent": 18000
  }
}
```

## Cases Endpoints

### List Cases
**GET** `/api/cases`

Retrieve published medical cases with filtering and pagination.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `specialty` (string): Filter by medical specialty
- `difficulty` (string): Filter by difficulty (beginner, intermediate, advanced)
- `bodySystem` (string): Filter by body system (comma-separated)
- `search` (string): Search in title and description
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order (asc, desc, default: desc)

**Example Request:**
```bash
GET /api/cases?specialty=Cardiology&difficulty=intermediate&page=1&limit=10
```

**Response:** `200 OK`
```json
{
  "cases": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "Acute Chest Pain in 55-Year-Old Male",
      "description": "Patient presents with sudden onset chest pain...",
      "specialty": "Cardiology",
      "difficulty": "intermediate",
      "estimatedDuration": 45,
      "metadata": {
        "author": {
          "profile": {
            "firstName": "Dr. Jane",
            "lastName": "Smith"
          }
        },
        "averageScore": 78.5,
        "completionRate": 92.3
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 47,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get Case Details
**GET** `/api/cases/:id`

Retrieve detailed information about a specific case.

**Headers:** `Authorization: Bearer TOKEN`

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "title": "Acute Chest Pain in 55-Year-Old Male",
  "description": "Comprehensive case study...",
  "patient": {
    "name": "John Patient",
    "age": 55,
    "gender": "male",
    "medicalHistory": ["Hypertension", "Hyperlipidemia"]
  },
  "presentation": {
    "chiefComplaint": "Chest pain",
    "historyOfPresentIllness": "Patient reports sudden onset..."
  },
  "simulationSteps": [
    {
      "stepId": "step1",
      "title": "Initial Assessment",
      "question": "What is your first priority?",
      "options": [
        {
          "optionId": "a",
          "text": "Obtain ECG",
          "explanation": "Correct - ECG is essential for chest pain evaluation"
        }
      ]
    }
  ]
}
```

### Create Case
**POST** `/api/cases`

Create a new medical case (instructors and admins only).

**Headers:** 
- `Authorization: Bearer TOKEN`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "title": "New Case Title",
  "description": "Detailed case description",
  "specialty": "Emergency Medicine",
  "bodySystem": ["Cardiovascular"],
  "difficulty": "intermediate",
  "estimatedDuration": 30,
  "patient": {
    "name": "Patient Name",
    "age": 45,
    "gender": "female"
  },
  "presentation": {
    "chiefComplaint": "Shortness of breath",
    "historyOfPresentIllness": "Patient presents with..."
  },
  "simulationSteps": [...],
  "diagnostics": {
    "finalDiagnosis": "Acute Heart Failure"
  },
  "treatment": {...}
}
```

## Simulation Endpoints

### Start Simulation
**POST** `/api/simulation/start/:caseId`

Begin a new simulation session for a specific case.

**Headers:** `Authorization: Bearer TOKEN`

**Response:** `200 OK`
```json
{
  "message": "Simulation session started successfully",
  "sessionId": "sim_1634567890_abc123",
  "case": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "Acute Chest Pain",
    "patient": {...},
    "presentation": {...},
    "metadata": {
      "estimatedDuration": 45,
      "maxScore": 100,
      "totalSteps": 8
    }
  }
}
```

### Process Simulation Step
**POST** `/api/simulation/step/:sessionId`

Submit an answer for the current simulation step.

**Headers:** `Authorization: Bearer TOKEN`

**Request Body:**
```json
{
  "currentStepId": "step1",
  "selectedOption": "a",
  "timeSpent": 120
}
```

**Response:** `200 OK`
```json
{
  "step": {
    "stepId": "step2",
    "title": "Next Assessment",
    "question": "Based on the ECG findings, what is your next action?",
    "options": [...]
  },
  "progress": {
    "stepsCompleted": 1,
    "totalSteps": 8,
    "currentScore": 10,
    "maxScore": 100,
    "timeSpent": 120,
    "percentageComplete": 12.5
  }
}
```

### Get Session Status
**GET** `/api/simulation/session/:sessionId`

Retrieve current simulation session status.

**Headers:** `Authorization: Bearer TOKEN`

**Response:** `200 OK`
```json
{
  "session": {
    "sessionId": "sim_1634567890_abc123",
    "status": "started",
    "caseId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "startDate": "2023-10-18T10:30:00.000Z"
  },
  "progress": {
    "stepsCompleted": 3,
    "totalSteps": 8,
    "currentScore": 25,
    "timeSpent": 450,
    "status": "started"
  }
}
```

## Real-time Features (Socket.IO)

### Connection

Connect to the Socket.IO server with authentication:

```javascript
import io from 'socket.io-client';

const socket = io('https://your-domain.com', {
  auth: {
    token: 'YOUR_ACCESS_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Simulation Events

```javascript
// Join a simulation session
socket.emit('join_simulation', sessionId);

// Listen for step completion updates
socket.on('step_completed', (data) => {
  console.log('Step completed:', data);
});

// Send step update
socket.emit('simulation_step_update', {
  sessionId: 'sim_123',
  stepId: 'step1',
  selectedOption: 'a'
});
```

### Discussion Events

```javascript
// Join case discussion
socket.emit('join_discussion', caseId);

// Listen for new discussions
socket.on('discussion_added', (data) => {
  console.log('New discussion:', data);
});

// Send new discussion
socket.emit('new_discussion', {
  caseId: 'case_123',
  content: 'Great case! I learned a lot.',
  type: 'comment'
});
```

### Notification Events

```javascript
// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Mark notification as read
socket.emit('mark_notification_read', notificationId);

// Get unread count
socket.emit('get_unread_count');
socket.on('unread_count', ({ count }) => {
  console.log('Unread notifications:', count);
});
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2023-10-18T10:30:00.000Z",
  "requestId": "req_1634567890_abc123"
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `AUTHENTICATION_ERROR` (401): Authentication required or failed
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT_ERROR` (409): Resource conflict (e.g., duplicate email)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

### Error Response Examples

**Validation Error:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ],
  "timestamp": "2023-10-18T10:30:00.000Z"
}
```

**Authentication Error:**
```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_ERROR",
  "timestamp": "2023-10-18T10:30:00.000Z"
}
```

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **Case Creation**: 10 cases per hour
- **File Upload**: 20 uploads per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Pagination

List endpoints support pagination with consistent parameters:

- `page`: Page number (starts at 1)
- `limit`: Items per page (max 100)

Pagination response format:
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 200,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Health Check

**GET** `/health`

Check API health status (no authentication required).

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2023-10-18T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "responseTime": 15
  },
  "cache": {
    "status": "connected",
    "responseTime": 5
  },
  "connectedUsers": 42
}
```

## SDKs and Libraries

### JavaScript/Node.js

```bash
npm install axios socket.io-client
```

```javascript
import axios from 'axios';
import io from 'socket.io-client';

const api = axios.create({
  baseURL: 'https://your-domain.com/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get cases
const cases = await api.get('/cases');

// Start simulation
const session = await api.post(`/simulation/start/${caseId}`);
```

### Python

```bash
pip install requests python-socketio
```

```python
import requests
import socketio

# API client
class MedicalCaseAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def get_cases(self, **params):
        response = requests.get(
            f'{self.base_url}/cases',
            headers=self.headers,
            params=params
        )
        return response.json()

# Socket.IO client
sio = socketio.Client()
sio.connect('https://your-domain.com', auth={'token': token})
```

## Support

For API support and questions:
- Documentation: `/api-docs`
- Email: api-support@your-domain.com
- GitHub Issues: [Repository Issues](https://github.com/your-org/medical-case-simulator)

## Changelog

### v1.0.0 (2023-10-18)
- Initial API release
- Authentication and user management
- Case management and simulation engine
- Real-time collaboration features
- Comprehensive error handling and monitoring