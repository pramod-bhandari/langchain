# Environment Variables and Security in Next.js

This document explains how environment variables work in Next.js and how we secure sensitive API keys.

## Next.js Environment Variables

Next.js handles environment variables in a specific way:

1. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
2. Variables without this prefix are only available on the server side
3. Client-side code cannot directly access server-side variables

## Securing API Keys

For security reasons, we follow these best practices:

### 1. Keep API Keys Server-Side

API keys like `OPENAI_API_KEY` must:
- NOT be prefixed with `NEXT_PUBLIC_`
- Only be accessed from server-side code (API routes, Server Components)
- Never exposed directly to client-side code

### 2. Secure API Routes

We use server-side API routes to:
- Process requests that need API keys
- Generate temporary tokens for secure operations
- Keep sensitive operations on the server

### 3. Worker Security

For Web Workers:
- We don't pass API keys directly to workers
- We use secure token-based authentication
- We implement fallback to server-side processing when needed

## Implementation Details

Our codebase securely handles API keys by:

1. Using the `config.ts` helper to safely check environment variables
2. Creating secure API endpoints like `/api/auth/token` for temporary access
3. Using server-side routes like `/api/documents/process` for sensitive operations
4. Implementing token-based authentication for Web Workers

## Setting Up Your Environment

1. Copy `docs/env.template` to `.env.local` in the project root
2. Fill in your actual API keys and credentials
3. Do NOT commit `.env.local` to version control
4. Ensure `OPENAI_API_KEY` doesn't have the `NEXT_PUBLIC_` prefix

For more information on Next.js environment variables, see [the official documentation](https://nextjs.org/docs/basic-features/environment-variables). 