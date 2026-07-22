import { createClient } from '@supabase/supabase-js';

// Hardcoded for testing - Bypassing Vercel Env Variables completely
const supabaseUrl = 'https://hfsypwqxvsdlpfefldgp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc3lwd3F4dnNkbHBmZWZsZGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODQyMTUsImV4cCI6MjEwMDI2MDIxNX0.w9BejQhCLpvHoETsKkVmEHEGh6CxMaCgVcrjPi3bKWo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);