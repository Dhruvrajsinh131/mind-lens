# MindLens Authentication Setup Guide

## 🚀 Custom Authentication with MongoDB Atlas

This guide will help you set up custom authentication using MongoDB Atlas and Mongoose.

## 📋 Prerequisites

- MongoDB Atlas account
- Node.js and npm installed
- Next.js project setup

## 🔧 Setup Steps

### 1. MongoDB Atlas Configuration

1. **Create a MongoDB Atlas account** at [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. **Create a new cluster** (free tier is fine for development)
3. **Create a database user**:
   - Go to Database Access
   - Add new database user
   - Choose password authentication
   - Save username and password
4. **Configure network access**:
   - Go to Network Access
   - Add IP address (use 0.0.0.0/0 for development, restrict in production)
5. **Get connection string**:
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string

### 2. Environment Variables

Update your `.env.local` file with your MongoDB Atlas credentials:

```bash
# Replace with your actual MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/mind-lens?retryWrites=true&w=majority

# Generate a strong JWT secret (you can use: openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-replace-this-with-something-secure
```

### 3. Test the Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test authentication**:
   - Visit http://localhost:3000
   - Click "Sign Up" to create a new account
   - Try signing in with your credentials
   - Check that the user data appears in your MongoDB Atlas database

## 🗂️ Project Structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── signin/route.ts      # Sign-in endpoint
│   │   ├── signup/route.ts      # Sign-up endpoint
│   │   ├── logout/route.ts      # Logout endpoint
│   │   └── me/route.ts          # Get current user
│   └── layout.tsx               # Root layout with AuthProvider
├── components/
│   ├── auth/
│   │   └── AuthModal.tsx        # Authentication modal
│   └── navbar/
│       └── navbar.tsx           # Updated navbar with auth
├── contexts/
│   └── AuthContext.tsx          # Authentication context
├── lib/
│   ├── auth.ts                  # Auth utilities (JWT, password hashing)
│   └── mongodb.ts               # MongoDB connection
├── models/
│   └── User.ts                  # User model schema
└── types/
    └── global.d.ts              # Global type definitions
```

## 🔐 Security Features

- **Password Hashing**: Uses bcryptjs with 12 salt rounds
- **JWT Tokens**: 7-day expiration with HTTP-only cookies
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Proper error messages without exposing sensitive info
- **Rate Limiting**: Consider adding rate limiting for production

## 🎨 UI Components

- **AuthModal**: Responsive modal with sign-in/sign-up forms
- **Password Toggle**: Show/hide password functionality
- **Form Validation**: Real-time validation with error messages
- **Loading States**: Loading indicators during authentication

## 🚀 Usage Examples

### Using the Authentication Context

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading, login, signup, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <p>Welcome, {user.name}!</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <div>Please sign in</div>;
}
```

### Making Authenticated API Requests

The authentication token is automatically included in cookies, so your API routes can access it:

```tsx
// In your API route
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Use decoded.userId to get user-specific data
  const userId = decoded.userId;
  // ... your logic here
}
```

## 🛡️ Security Best Practices

1. **Environment Variables**: Never commit your `.env.local` file
2. **Strong Passwords**: Enforce minimum password requirements
3. **HTTPS**: Use HTTPS in production
4. **CORS**: Configure CORS properly for your domain
5. **Rate Limiting**: Implement rate limiting on auth endpoints
6. **Input Sanitization**: Sanitize all user inputs
7. **Logging**: Log authentication events for monitoring

## 🚨 Troubleshooting

### Common Issues

1. **Connection Error**: Check your MongoDB Atlas connection string and network access
2. **JWT Secret Error**: Make sure JWT_SECRET is set in your environment variables
3. **Cookie Issues**: Ensure cookies are enabled in your browser
4. **Build Errors**: Make sure all dependencies are installed

### Database Connection Issues

If you're having trouble connecting to MongoDB Atlas:

1. Check your connection string format
2. Verify your database user credentials
3. Ensure your IP address is whitelisted
4. Test the connection string in MongoDB Compass

## 🎯 Next Steps

1. **Add password reset functionality**
2. **Implement email verification**
3. **Add social authentication (Google, GitHub, etc.)**
4. **Add user profile management**
5. **Implement role-based access control**
6. **Add two-factor authentication**

## 📚 API Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in with email/password
- `POST /api/auth/logout` - Logout and clear cookies
- `GET /api/auth/me` - Get current authenticated user

## 🎯 App Structure

- **Landing Page (`/`)**: Beautiful landing page that showcases MindLens features
  - Displays app benefits and features
  - Sign up/Sign in buttons for unauthenticated users
  - Direct access to the app for authenticated users
  
- **Main App (`/book`)**: Protected route with the core MindLens functionality
  - Requires authentication to access
  - Contains the sources panel and chat interface
  - Automatically redirects unauthenticated users to the landing page

That's it! Your authentication system is now ready to use. 🎉
