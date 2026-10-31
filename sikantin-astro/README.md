# SiKantin Astro

## Astro application

```sh
npm install
npm run dev
npm run build
npm start
npm run preview
```

The app uses Astro's Vercel adapter for dynamic `/tenant/[slug]` and `/sitemap.xml` routes. Configure `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in the app environment when deploying to another Supabase project.

## Guest orders and Supabase

Apply the migrations in `../supabase/migrations` before deploying the app. Deploy the `validate-nim`, `create-guest-order`, `lookup-guest-order`, and `notify-order-rejected` Edge Functions for guest ordering and order notifications. These functions verify their own input and use the service-role key only on the server; never expose that key to the browser. `create-user` and `admin-reset-password` are administrator-only student-account functions.

Tenant slugs are generated from the tenant name and made unique if names collide. Existing tenant links are `/tenant/<slug>`. Guest checkout verifies NIM through `validate-nim`, and the order-creation function independently verifies the NIM again before saving an order.

Guest QRIS checkout requires a JPG/PNG proof image up to 5 MB. The `create-guest-order` Edge Function validates the image, uploads it to the `bukti-transfer` bucket using the service role, and stores its public URL in `orders.bukti_transfer`. The bucket is public-read so tenant dashboards can display proof links; do not upload documents containing unrelated personal or financial details.

Order tracking uses a cryptographically random token as a bearer credential. Guest order rows are not readable through the public database API; `lookup-guest-order` returns only the order summary for a valid token. Realtime status updates are broadcast on a token-specific public channel and contain only the token, status, and update time. Treat the token as private.

The tenant dashboard loads `order_items.add_ons` and shows add-on names and extra prices beneath each menu item. It subscribes to tenant-filtered order INSERT/UPDATE/DELETE events so changes in another tab refresh the order list; successful local status changes refresh orders, menu data, and statistics as well.

After an order reaches `Selesai`, its token can be used to submit one 1–5 star rating for the order's tenant. Ratings are stored in `tenant_reviews`; direct table access is disabled, and the `submit_guest_order_rating` RPC verifies the token and completed status before saving. Public catalog pages read aggregated averages through `get_public_tenant_ratings`. Apply `../supabase/migrations/20261029000001_tenant_reviews.sql` after the existing menu-review migration to enable this feature. Existing per-menu ratings are migrated to one rounded average per order.

Daily queue numbers increase continuously for each tenant and restart at `A-01` when the date changes in the `Asia/Jakarta` timezone. Apply `../supabase/migrations/20261029000003_restore_daily_queue_numbering.sql` to restore this behavior if the queue-cycle migration was previously applied.

## WhatsApp order notifications

The `create-guest-order` Edge Function sends a receipt to `orders.phone` and a new-order notification to the tenant through the local Baileys gateway over an ngrok HTTPS tunnel. `notify-order-rejected` sends the rejection reason to the buyer. Both order functions contain their WhatsApp helper inline; they do not import `_shared`. Set `WA_GATEWAY_URL`, `WA_API_KEY`, and the public application base URL in `APP_URL` as Supabase Edge Function secrets. The buyer receipt includes the tenant, queue number, saved menu details, order total, and a token link to `/cek-pesanan`. If the gateway or `APP_URL` is not configured, or a send fails, the database order operation remains independent of message delivery and the response indicates the notification result. Student registration does not send WhatsApp.

To run the local gateway, set `WA_API_KEY` to a random secret with at least 32 characters in the Astro server environment, then run `npm run wa:server`. The server binds to `127.0.0.1` by default. Keep the WhatsApp session files outside the repository.

## WhatsApp gateway

Copy `.env.example` to `.env` and set `SUPABASE_URL` plus `SUPABASE_KEY` to the project URL and server-only service-role key. Never use the service-role key in browser code or commit it. The gateway records incoming text-message metadata in `public.messages`; it does not download media content. Apply `../supabase/migrations/20261027000008_whatsapp_messages.sql` before connecting WhatsApp.

The HTTP gateway listens on `PORT` (or legacy `WA_PORT`) and accepts Indonesian mobile numbers beginning with `628` and messages up to 4096 characters. The API key is required. `WA_HOST` defaults to `127.0.0.1`; keep it bound to localhost and expose it through ngrok rather than binding the gateway directly to the network.

To connect Supabase to the local gateway:

1. Install and authenticate the ngrok CLI, then copy `.env.example` to `.env`. Configure `SUPABASE_URL`, the server-only `SUPABASE_KEY`, and a random `WA_API_KEY` of at least 32 characters.
2. Start the gateway with `npm run wa:server` (or `node index.js` from the repository root). Scan the displayed WhatsApp QR code if this session has not been linked.
3. In another terminal, run `npm run wa:tunnel`. Copy the HTTPS forwarding URL shown by ngrok.
4. In the linked Supabase project, set Edge Function secrets using the ngrok URL, the exact same API key configured in the gateway, and the public site URL: `supabase secrets set WA_GATEWAY_URL=https://<your-ngrok-domain> WA_API_KEY=<your-random-secret> APP_URL=https://sikantin.ndhistira.my.id`.
5. Deploy or redeploy `create-guest-order` and `notify-order-rejected` as needed, then place a test order and check their function logs. In `supabase/config.toml`, both have `verify_jwt = false`; rejection still requires a valid bearer token and the owning tenant's role in function code.

The free ngrok URL can change when its tunnel restarts; update the `WA_GATEWAY_URL` secret each time it changes. Keep both terminals running while Supabase needs to send messages. Do not share or commit the service-role key, gateway API key, or Baileys session files.

## SEO and sitemap

`/robots.txt` points crawlers to the dynamic `/sitemap.xml` endpoint. The sitemap lists the homepage, order tracking page, and public tenant catalog pages; it excludes login and dashboard routes. The endpoint queries public tenant slugs using `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Apply the migration that grants `anon` read access to public tenant data before deploying; the endpoint falls back to querying only `slug` if `updated_at` is unavailable.

WhatsApp session files stay in the existing `auth_info_baileys` directory outside this project. Set `WA_AUTH_DIR` to use a different session location. Do not copy or commit session credentials.

`npm run wa:connect` starts only the WhatsApp connection and QR display without starting the HTTP API. Do not run it at the same time as `npm run wa:server`, since both use the same WhatsApp session.

## Routes

- `/` — guest tenant directory
- `/tenant/<slug>` — guest menu and checkout
- `/cek-pesanan` — token-based order tracking
- `/sitemap.xml` — generated public sitemap
- `/robots.txt` — crawler directives and sitemap location
- `/tenant/login` — tenant owner login
- `/tenant/<slug>/dashboard` — tenant dashboard
- `/admin/login` — administrator login
- `/admin/dashboard` — existing administrator CRUD dashboard
