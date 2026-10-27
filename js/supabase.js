// js/supabase.js
const SUPABASE_URL = 'https://zafuozcduvijohjnbycw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6Q0t_6APlA235Mct8E85aw_o3BbJgZ0';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);