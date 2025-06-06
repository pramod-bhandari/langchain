/**
 * Environment variable utilities
 * Provides safe access to environment variables with helpful error messages
 */

/**
 * Get an environment variable with proper error handling
 * @param key The environment variable name
 * @param defaultValue Optional default value if not found
 * @param required Whether this variable is required
 * @returns The environment variable value or default
 */
export function getEnvVar(key: string, defaultValue?: string, required = false): string {
  const value = process.env[key] || defaultValue || '';
  
  // Check if this is a client-side environment variable that should have NEXT_PUBLIC_ prefix
  if (typeof window !== 'undefined' && !key.startsWith('NEXT_PUBLIC_')) {
    console.warn(`Attempting to access non-NEXT_PUBLIC_ environment variable '${key}' from client-side code. This won't work!`);
    return defaultValue || '';
  }
  
  if (required && !value) {
    // In development, provide a helpful error message
    const errorMessage = `Required environment variable ${key} is missing`;
    if (process.env.NODE_ENV === 'development') {
      console.error(`🔴 ${errorMessage}`);
      console.info(`ℹ️ Make sure to set ${key} in your .env.local file`);
      
      // If this is a client-side env var, add a hint about NEXT_PUBLIC_ prefix
      if (!key.startsWith('NEXT_PUBLIC_') && typeof window !== 'undefined') {
        console.info(`ℹ️ For client-side access, rename to NEXT_PUBLIC_${key.replace(/^NEXT_PUBLIC_/, '')}`);
      }
    }
    
    if (typeof window === 'undefined') {
      // We're on the server, throw an error
      throw new Error(errorMessage);
    }
  }
  
  return value;
}

/**
 * Configuration values with defaults
 */
export const config = {
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_PRIVATE_KEY'), // Support both variable names
  },
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    embeddingModel: getEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
  },
  upload: {
    maxSizeMB: parseInt(getEnvVar('MAX_UPLOAD_SIZE', '50'), 10),
  },
};

// Validate required environment variables - only runs on server
export function validateConfig() {
  // Skip validation on client
  if (typeof window !== 'undefined') {
    return true;
  }
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please create a .env.local file in the root directory with these variables.');
    return false;
  }
  
  return true;
} 