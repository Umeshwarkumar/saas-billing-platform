# Gym & Fitness Membership Management System

## Project Description
A comprehensive backend application for managing a gym and fitness center, providing robust endpoints for user registration, authentication, membership plan administration, user membership tracking, and trainer profile management.

## Technology Stack
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- express-validator
- CORS
- dotenv

## Sprint 1 Modules Implemented
1. **Member Registration & Authentication**: Secure user registration and login with JWT-based authentication. Supports distinct roles securely.
2. **Membership Plan Management**: Administrative creation, viewing, updating, and deactivation of gym membership plans (e.g., Bronze, Silver, Gold).
3. **Membership Purchase & Expiry Tracking**: Users can purchase active membership plans. The system supports automated calculation of expiry dates using calendar-month mathematics and prevents duplicate active memberships.
4. **Trainer Profile Management**: Enables trainers to establish, view, update, and deactivate their professional profiles, strictly blocking unauthorized access by non-trainers.

## User Roles
The application enforces strict role-based access control:
- **member**: Standard access. Can purchase memberships, view active plans, and cancel their own memberships. Blocked from trainer and administrative features.
- **trainer**: Dedicated access to manage their own trainer profile (create, read, update, deactivate). Blocked from administrative features.
- **branch_admin**: Highest level of access. Can manage membership plans, cancel memberships, and run expiration scripts.

## Project Structure
```text
.
├── config
│   └── db.js
├── controllers
│   ├── authController.js
│   ├── membershipController.js
│   ├── membershipPlanController.js
│   └── trainerController.js
├── middleware
│   ├── auth.js
│   └── errorHandler.js
├── models
│   ├── Membership.js
│   ├── MembershipPlan.js
│   ├── TrainerProfile.js
│   └── User.js
├── routes
│   ├── authRoutes.js
│   ├── membershipPlanRoutes.js
│   ├── membershipRoutes.js
│   └── trainerRoutes.js
├── utils
│   └── auth.js
├── validators
│   ├── authValidator.js
│   ├── membershipPlanValidator.js
│   ├── membershipValidator.js
│   └── trainerValidator.js
├── .env.example
├── package.json
└── server.js
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables by copying the example file:
   ```bash
   cp .env.example .env
   ```
3. Provide the required environment variables in `.env`:
   - `PORT`: Server port (e.g., 5000)
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secret key for signing tokens
   - `JWT_EXPIRES_IN`: Token expiry (e.g., 1d)
4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` (Public) - Register a new user.
- `POST /api/auth/login` (Public) - Login and receive a JWT.
- `GET /api/auth/me` (Authenticated) - Get current logged-in user details.

### 2. Membership Plans (`/api/membership-plans`)
- `POST /api/membership-plans` (`branch_admin`) - Create a new membership plan.
- `GET /api/membership-plans` (Authenticated) - Retrieve all active membership plans.
- `GET /api/membership-plans/:id` (Authenticated) - Retrieve a specific membership plan.
- `PUT /api/membership-plans/:id` (`branch_admin`) - Update an existing membership plan.
- `PATCH /api/membership-plans/:id/deactivate` (`branch_admin`) - Deactivate a membership plan.
- `PATCH /api/membership-plans/:id/activate` (`branch_admin`) - Activate a membership plan.

### 3. Memberships (`/api/memberships`)
- `POST /api/memberships` (Authenticated) - Purchase a membership.
- `GET /api/memberships/me` (Authenticated) - Get the active membership for the current user.
- `GET /api/memberships/me/history` (Authenticated) - Get all past and current memberships for the user.
- `PATCH /api/memberships/:id/cancel` (Authenticated) - Cancel the user's own membership.
- `PATCH /api/memberships/expire` (`branch_admin`) - Process and expire memberships past their end date.

### 4. Trainer Profiles (`/api/trainers`)
- `POST /api/trainers/profile` (`trainer`) - Create a trainer profile.
- `GET /api/trainers/profile` (`trainer`) - Retrieve the logged-in trainer's profile.
- `PUT /api/trainers/profile` (`trainer`) - Update the trainer's profile.
- `PATCH /api/trainers/profile/deactivate` (`trainer`) - Deactivate the trainer's profile.
- `PATCH /api/trainers/profile/activate` (`trainer`) - Activate the trainer's profile.

## Authentication Information
Protected APIs utilize JSON Web Tokens (JWT). When making requests to protected routes, include the JWT within the `Authorization` header exactly as follows:
`Authorization: Bearer <JWT_TOKEN>`

## Validation and Error Handling
The application relies on `express-validator` to ensure robust input validation on all incoming data. A centralized error handling middleware (`errorHandler.js`) ensures that all errors return a standardized JSON format without exposing internal stack traces:
```json
{
  "success": false,
  "message": "Human-readable message",
  "errorCode": "SPECIFIC_ERROR_CODE"
}
```

## Database
Sprint 1 utilizes the following MongoDB Collections via Mongoose models:
- `users` (Model: `User`)
- `membershipplans` (Model: `MembershipPlan`)
- `memberships` (Model: `Membership`)
- `trainerprofiles` (Model: `TrainerProfile`)

## Testing
Sprint 1 functionality was fully regression-tested across all endpoints and edge cases. Authentication, permissions, model validation, and error states were actively verified and passed.

## Security Notes
- Passwords are symmetrically hashed before saving using `bcrypt`.
- Authentication logic is handled securely via JWT.
- `passwordHash` and other highly sensitive fields are strictly excluded from API responses.
- Application secrets are isolated to the `.env` configuration file.
- The `.env` file is explicitly ignored by Git to prevent accidental exposure of production credentials.

## GitHub Submission Note
When submitting or pushing your work to GitHub, please ensure that you do NOT commit your `.env` file or any real MongoDB URIs, passwords, or JWT secrets. Rely exclusively on `.env.example` as a template.
