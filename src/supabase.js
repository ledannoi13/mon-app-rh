import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://nonzbkgdlhfdwtxdxbwo.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbnpia2dkbGhmZHd0eGR4YndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTUyNDEsImV4cCI6MjA5MDY5MTI0MX0.2v6g01Ur5qPjttomgEtdsmBLTXOho4jUOGK3N9biTQU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)