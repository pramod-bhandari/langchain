import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or Service Key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAnnotationsTable() {
  try {
    console.log('Creating annotations table...');

    // Check if the table exists first
    const { data: existingTables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'annotations');

    if (tablesError) {
      throw tablesError;
    }

    if (existingTables && existingTables.length > 0) {
      console.log('Annotations table already exists');
      return;
    }

    // Create the annotations table
    const { error } = await supabase.rpc('create_annotations_table');

    if (error) {
      throw error;
    }

    console.log('Annotations table created successfully');

    // Create RLS policies
    console.log('Setting up Row Level Security policies...');
    
    // Enable RLS on the table
    const { error: rlsError } = await supabase.rpc('enable_rls_on_annotations');
    if (rlsError) throw rlsError;

    // Create select policy
    const { error: selectError } = await supabase.rpc('create_annotations_select_policy');
    if (selectError) throw selectError;

    // Create insert policy
    const { error: insertError } = await supabase.rpc('create_annotations_insert_policy');
    if (insertError) throw insertError;
    
    // Create delete policy
    const { error: deleteError } = await supabase.rpc('create_annotations_delete_policy');
    if (deleteError) throw deleteError;

    console.log('RLS policies created successfully');

  } catch (error) {
    console.error('Error creating annotations table:', error);
    process.exit(1);
  }
}

createAnnotationsTable(); 