import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'add-file-url-column.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Execute the SQL
async function runSqlScript() {
  try {
    console.log('Adding file_url column to documents table...');
    
    // Set the app.supabase_url setting
    console.log('Setting app.supabase_url configuration value...');
    try {
      const { error } = await supabase.rpc('set_config', {
        param: 'app.supabase_url',
        value: supabaseUrl,
        is_local: false
      });
      
      if (error) throw error;
      console.log('Successfully set app.supabase_url configuration value');
    } catch (err) {
      console.warn('Could not set app.supabase_url configuration value. Script may still work if it exists already.');
      console.error('Error:', err.message);
    }
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error executing SQL script:', error.message);
      console.log('\nYou may need to run this SQL script manually in the Supabase SQL Editor:');
      console.log('\n' + sqlContent);
      return;
    }
    
    console.log('Successfully added file_url column to documents table');
  } catch (err) {
    console.error('Error running script:', err.message);
    console.log('\nYou may need to run this SQL script manually in the Supabase SQL Editor:');
    console.log('\n' + sqlContent);
  }
}

runSqlScript(); 