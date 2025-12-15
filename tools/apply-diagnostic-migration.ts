/**
 * Script to apply diagnostic logs migration for rewards and triggers
 * 
 * This script applies the SQL migration to extend diagnostic_logs table
 * to support 'reward' and 'trigger' categories
 * 
 * Usage: npx tsx tools/apply-diagnostic-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function applyMigration() {
  console.log('🔧 Applying diagnostic logs migration for rewards and triggers...\n')

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '../supabase/migrations/extend_diagnostic_logs_for_rewards_triggers.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration SQL:')
  console.log('─'.repeat(60))
  console.log(migrationSQL)
  console.log('─'.repeat(60))
  console.log()

  try {
    // Execute the migration SQL
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.length === 0) continue
      
      console.log(`📝 Executing: ${statement.substring(0, 60)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement }).catch(async () => {
        // If exec_sql doesn't exist, try direct query execution via REST API
        // We'll use a workaround: execute via a custom function or use the REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql: statement })
        })
        
        if (!response.ok) {
          // Try alternative: use PostgREST to execute via a function
          // Actually, we need to use the Supabase client's query method
          // But Supabase JS client doesn't support raw SQL execution
          // So we'll need to use the REST API directly with the SQL endpoint
          throw new Error(`Failed to execute SQL: ${response.status}`)
        }
        
        return { error: null }
      })

      if (error) {
        // Try direct execution via REST API
        try {
          // Supabase doesn't expose raw SQL execution via JS client
          // We need to use the SQL editor API or create a function
          // For now, let's try using the REST API with a custom approach
          console.log('⚠️  Direct RPC failed, trying alternative method...')
          
          // Actually, the best way is to use Supabase's SQL editor API
          // But that requires admin API which isn't available in JS client
          // So we'll output instructions instead
          throw new Error('Direct SQL execution not available via JS client')
        } catch (altError) {
          console.error(`❌ Error executing statement: ${error.message || altError}`)
          console.error('   This migration needs to be applied manually via Supabase Dashboard')
          console.error('   or using Supabase CLI: supabase db push')
          throw error
        }
      }
    }

    console.log('\n✅ Migration applied successfully!')
    console.log('   The diagnostic_logs table now supports "reward" and "trigger" categories')
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\n📋 Manual application required:')
    console.error('   1. Go to Supabase Dashboard → SQL Editor')
    console.error('   2. Copy the content of: supabase/migrations/extend_diagnostic_logs_for_rewards_triggers.sql')
    console.error('   3. Paste and execute the SQL')
    process.exit(1)
  }
}

// Alternative: Use Supabase Management API if available
// Or create a temporary function to execute the SQL
async function applyMigrationViaFunction() {
  console.log('🔧 Applying migration via temporary function...\n')

  // Create a temporary function to execute the migration
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION apply_diagnostic_migration()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Drop the old check constraint if it exists
      ALTER TABLE diagnostic_logs DROP CONSTRAINT IF EXISTS diagnostic_logs_category_check;
      
      -- Add new check constraint with extended categories
      ALTER TABLE diagnostic_logs ADD CONSTRAINT diagnostic_logs_category_check 
        CHECK (category IN ('altar', 'admin', 'reward', 'trigger'));
    END;
    $$;
  `

  try {
    // First, create the function
    console.log('📝 Creating migration function...')
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL }).catch(() => {
      // If exec_sql doesn't exist, we need to use a different approach
      return { error: new Error('exec_sql function not available') }
    })

    if (createError) {
      throw createError
    }

    // Then execute it
    console.log('📝 Executing migration function...')
    const { error: execError } = await supabase.rpc('apply_diagnostic_migration')

    if (execError) {
      throw execError
    }

    // Clean up the function
    console.log('🧹 Cleaning up migration function...')
    await supabase.rpc('exec_sql', { sql: 'DROP FUNCTION IF EXISTS apply_diagnostic_migration();' }).catch(() => {
      // Ignore cleanup errors
    })

    console.log('\n✅ Migration applied successfully!')
    
  } catch (error: any) {
    console.error('\n❌ Migration via function failed:', error.message)
    throw error
  }
}

// Best approach: Use the REST API to execute SQL directly
async function applyMigrationDirect() {
  console.log('🔧 Applying migration directly via Supabase REST API...\n')

  const migrationSQL = `
    ALTER TABLE diagnostic_logs DROP CONSTRAINT IF EXISTS diagnostic_logs_category_check;
    ALTER TABLE diagnostic_logs ADD CONSTRAINT diagnostic_logs_category_check 
      CHECK (category IN ('altar', 'admin', 'reward', 'trigger'));
  `

  // Supabase JS client doesn't support raw SQL execution
  // We need to use the Management API or SQL Editor API
  // For now, let's try using a workaround with a custom RPC function
  
  console.log('⚠️  Direct SQL execution not available via Supabase JS client')
  console.log('📋 Please apply the migration manually:')
  console.log('   1. Go to Supabase Dashboard → SQL Editor')
  console.log('   2. Copy and execute the following SQL:\n')
  console.log(migrationSQL)
  console.log('\n   Or use Supabase CLI:')
  console.log('   supabase db push')
  
  // Actually, let's try to use the REST API endpoint for SQL execution
  // This requires the Management API key which might not be available
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    })

    if (response.ok) {
      console.log('✅ Migration applied via REST API!')
      return
    }
  } catch (error) {
    // REST API approach failed, continue with manual instructions
  }

  // Final fallback: provide manual instructions
  console.log('\n📝 Manual application required.')
  process.exit(0)
}

// Main execution
async function main() {
  try {
    // Try direct application first
    await applyMigrationDirect()
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

main()
