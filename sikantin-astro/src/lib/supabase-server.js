import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://zafuozcduvijohjnbycw.supabase.co';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_6Q0t_6APlA235Mct8E85aw_o3BbJgZ0';

if (!supabaseUrl || !supabaseKey) {
	throw new Error('PUBLIC_SUPABASE_URL dan PUBLIC_SUPABASE_ANON_KEY wajib dikonfigurasi.');
}

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});
