require('../env.cjs');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL dan SUPABASE_KEY wajib diatur di environment gateway.');
}

if (!/^https:\/\//i.test(supabaseUrl)) {
    throw new Error('SUPABASE_URL harus menggunakan HTTPS.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = { supabase };
