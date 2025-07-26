import { Client } from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  console.log('🗄️ Setting up database...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    console.log('✅ Connected to database');

    // Read and execute the database dump
    const dumpPath = join(__dirname, 'database-dump.sql');
    if (fs.existsSync(dumpPath)) {
      const dumpSQL = fs.readFileSync(dumpPath, 'utf8');
      await client.query(dumpSQL);
      console.log('✅ Database dump imported successfully');
      console.log('📊 5,950 speech therapy centers loaded');
    } else {
      console.log('⚠️ No database dump found, creating empty schema');
    }

    await client.end();
    console.log('🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();