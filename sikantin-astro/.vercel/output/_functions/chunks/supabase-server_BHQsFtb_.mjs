import { createClient } from "@supabase/supabase-js";
var supabaseServer = createClient("https://zafuozcduvijohjnbycw.supabase.co", "sb_publishable_6Q0t_6APlA235Mct8E85aw_o3BbJgZ0", { auth: {
	autoRefreshToken: false,
	persistSession: false
} });
export { supabaseServer as t };
