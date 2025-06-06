import { createClient, SupabaseClient } from '@supabase/supabase-js';
import getConfig from 'next/config';

// Access runtime config if available
const { publicRuntimeConfig } = getConfig() || { publicRuntimeConfig: {} };

// Create Supabase client with proper environment variable handling
// Try multiple sources for the environment variables
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  publicRuntimeConfig?.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  publicRuntimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

// Check if we have the necessary environment variables
const hasSupabaseCredentials = supabaseUrl && supabaseAnonKey;

// Debug: log credential status (only in development)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  console.log('Supabase initialization:', { 
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    directUrlEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    directKeyEnv: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    runtimeConfigUrl: !!publicRuntimeConfig?.NEXT_PUBLIC_SUPABASE_URL,
    runtimeConfigKey: !!publicRuntimeConfig?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    credentialsValid: hasSupabaseCredentials
  });
}

// Only create the client if we have credentials
export const supabase = hasSupabaseCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Type for our builder to avoid using 'any'
type MockQueryBuilder = {
  [key: string]: (...args: unknown[]) => MockQueryBuilder | { data: null; error: Error };
};

// Create a mock Supabase client for SSR or when credentials are missing
// This prevents client-side rendering errors
const createMockClient = (): SupabaseClient => {
  const missingCredentialsError = new Error(
    'Supabase client not initialized. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.'
  );
  
  const mockResponse = { 
    data: null, 
    error: missingCredentialsError
  };
  
  const mockInsert = () => mockResponse;
  const mockUpdate = () => mockResponse;
  const mockDelete = () => mockResponse;
  const mockUpsert = () => mockResponse;
  const mockRpc = () => mockResponse;
  
  // Create a chainable query builder
  const createMockQueryBuilder = (): MockQueryBuilder => {
    const builder: MockQueryBuilder = {
      select: () => builder,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      upsert: mockUpsert,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      lt: () => builder,
      gte: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      containedBy: () => builder,
      overlap: () => builder,
      textSearch: () => builder,
      filter: () => builder,
      or: () => builder,
      and: () => builder,
      not: () => builder,
      match: () => builder,
      single: () => mockResponse,
      maybeSingle: () => mockResponse,
      limit: () => builder,
      order: () => builder,
      rangeAdjust: () => builder, // renamed from range to avoid duplicate
      rpc: mockRpc
    };
    
    return builder;
  };
  
  // Create a mock client
  return {
    from: () => createMockQueryBuilder(),
    rpc: mockRpc,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ 
          data: null, 
          error: new Error('Storage not available: Missing Supabase credentials. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') 
        }),
        list: () => Promise.resolve({ 
          data: [], 
          error: new Error('Storage not available: Missing Supabase credentials. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') 
        }),
        download: () => Promise.resolve({ 
          data: null, 
          error: new Error('Storage not available: Missing Supabase credentials. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') 
        }),
        remove: () => Promise.resolve({ 
          data: null, 
          error: new Error('Storage not available: Missing Supabase credentials. Check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') 
        })
      })
    },
    // Add any other methods needed to match the SupabaseClient interface
  } as unknown as SupabaseClient;
};

// Helper function to get the client safely
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.error('Supabase client not initialized. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.');
      console.info('For production, set these variables in your deployment environment.');
    }
    
    return createMockClient();
  }
  
  return supabase;
} 