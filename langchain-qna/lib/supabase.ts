import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Initializing Supabase client with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false
    },
    db: {
        schema: 'public'
    }
});

// Test the connection
(async () => {
    try {
        const { data, error } = await supabase.from('documents').select('count').single();
        if (error) {
            console.error('Supabase connection test failed:', error);
        } else {
            console.log('Supabase connection successful');
        }
    } catch (error) {
        console.error('Supabase connection error:', error);
    }
})(); 