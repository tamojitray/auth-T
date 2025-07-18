# auth-T API Documentation

A robust authentication API built with Node.js, Express, MongoDB, and Redis.

## Overview

This API provides authentication and authorization services including user registration, login, token management, and session handling.

## Base URL

```
http://localhost:3000
```

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Session Store**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Environment Management**: dotenv

## Environment Setup

Copy `.env.template` to `.env` and configure the following variables:

```env
MONGO_URL=mongodb://your-mongo-connection-string
REDIS_URL=redis://your-redis-connection-string
JWT_ACCESS_SECRET=your-secure-access-token-secret
JWT_REFRESH_SECRET=your-secure-refresh-token-secret
```

## Authentication Flow

The API uses JWT-based authentication with access and refresh tokens:

1. **Access Token**: Short-lived token for API requests (typically 15-30 minutes)
2. **Refresh Token**: Long-lived token for obtaining new access tokens (typically 7-30 days)
3. **Session Management**: Redis is used for session storage and token blacklisting

## API Endpoints

### Authentication Routes

All authentication endpoints are prefixed with `/auth`

#### Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "username"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "unique-user-id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

#### Login User

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "userId": "unique-user-id",
      "email": "user@example.com",
      "username": "username"
    }
  }
}
```

#### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

#### Logout User

```http
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Get User Profile

```http
GET /auth/profile
```

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "unique-user-id",
    "email": "user@example.com",
    "username": "username",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Change Password

```http
PUT /auth/password
```

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Request/Response Format

### Request Headers

All protected endpoints require the following header:

```
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Response Format

All API responses follow this standard format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 400  | Bad Request - Invalid request data |
| 401  | Unauthorized - Invalid or missing authentication |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists |
| 422  | Unprocessable Entity - Validation error |
| 500  | Internal Server Error - Server error |

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `USER_EXISTS` | User with this email already exists |
| `USER_NOT_FOUND` | User does not exist |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `TOKEN_EXPIRED` | JWT token has expired |
| `VALIDATION_ERROR` | Request data validation failed |
| `DATABASE_ERROR` | Database operation failed |
| `REDIS_ERROR` | Redis operation failed |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Login attempts**: 5 attempts per 15 minutes per IP
- **Registration**: 3 attempts per hour per IP
- **General API calls**: 100 requests per 15 minutes per IP

## Security Features

1. **Password Hashing**: Passwords are hashed using bcryptjs
2. **JWT Security**: Access and refresh tokens with different secrets
3. **Token Blacklisting**: Logout invalidates tokens via Redis
4. **Session Management**: Redis-based session storage
5. **Input Validation**: All inputs are validated and sanitized
6. **CORS Protection**: Configurable CORS policies

## Database Schema

### Users Collection (MongoDB)

```javascript
{
  "_id": ObjectId,
  "userId": "uuid-string",
  "email": "string (unique)",
  "username": "string (unique)",
  "passwordHash": "string",
  "createdAt": Date,
  "updatedAt": Date,
  "isActive": Boolean,
  "lastLogin": Date
}
```

### Redis Keys

- `session:{userId}`: User session data
- `blacklist:{tokenId}`: Blacklisted tokens
- `rateLimit:{ip}:{endpoint}`: Rate limiting data

## Development

### Running the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### Project Structure

```
auth-T/
├── src/
│   ├── server.js          # Main server file
│   ├── config/
│   │   └── db.js          # Database configuration
│   ├── routes/            # API route handlers
│   ├── middleware/        # Custom middleware
│   ├── models/           # Database models
│   └── utils/            # Utility functions
├── docker/               # Docker configuration
├── .env                 # Environment variables
├── package.json         # Dependencies
└── README.md           # Project overview
```

## Dependencies

- **express**: Web framework
- **mongodb**: MongoDB driver
- **redis**: Redis client
- **jsonwebtoken**: JWT implementation
- **bcryptjs**: Password hashing
- **dotenv**: Environment variables
- **uuid**: Unique identifier generation

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Support

For questions or issues, please refer to the project repository or contact the development team.