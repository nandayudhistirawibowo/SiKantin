# SiKantin Astro

## Astro application

```sh
npm install
npm run dev
npm run build
npm start
npm run preview
```

The app uses Astro's Node adapter for dynamic `/tenant/[slug]` routes. Configure `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in the app environment when deploying to another Supabase project.

## Guest orders and Supabase

Apply the migrations in `../supabase/migrations` before deploying the app. Deploy the `validate-nim`, `create-guest-order`, and `lookup-guest-order` Edge Functions. These guest functions verify their own input and use the service-role key only on the server; never expose that key to the browser.

Tenant slugs are generated from the tenant name and made unique if names collide. Existing tenant links are `/tenant/<slug>`. Guest checkout verifies NIM through `validate-nim`, and the order-creation function independently verifies the NIM again before saving an order.

Guest QRIS checkout requires a JPG/PNG proof image up to 5 MB. The `create-guest-order` Edge Function validates the image, uploads it to the `bukti-transfer` bucket using the service role, and stores its public URL in `orders.bukti_transfer`. The bucket is public-read so tenant dashboards can display proof links; do not upload documents containing unrelated personal or financial details.

Order tracking uses a cryptographically random token as a bearer credential. Guest order rows are not readable through the public database API; `lookup-guest-order` returns only the order summary for a valid token. Realtime status updates are broadcast on a token-specific public channel and contain only the token, status, and update time. Treat the token as private.

After an order reaches `Selesai`, its token can be used to submit one 1–5 star rating for the order's tenant. Ratings are stored in `tenant_reviews`; direct table access is disabled, and the `submit_guest_order_rating` RPC verifies the token and completed status before saving. Public catalog pages read aggregated averages through `get_public_tenant_ratings`. Apply `../supabase/migrations/20261029000001_tenant_reviews.sql` after the existing menu-review migration to enable this feature. Existing per-menu ratings are migrated to one rounded average per order.

Daily queue numbers restart at `A-01` when every order in the tenant's current queue cycle is `Selesai` or `Dibatalkan`. The cycle identifier is persisted with each order to allow the visible queue number to be reused without violating uniqueness. Apply `../supabase/migrations/20261029000002_queue_cycles.sql`; the `create-guest-order` Edge Function now stores the cycle returned by `next_tenant_queue_number`.

## WhatsApp order notifications

The guest-order Edge Function sends a receipt to `orders.phone` through the local Baileys gateway over an ngrok HTTPS tunnel. Set `WA_GATEWAY_URL`, `WA_API_KEY`, and the public application base URL in `APP_URL` as Supabase Edge Function secrets. The WhatsApp receipt includes the tenant, queue number, saved menu details, order total, and a token link to `/cek-pesanan`. If the gateway or `APP_URL` is not configured, or a send fails, the order is still saved and the returned response indicates the notification result.

To run the local gateway, set `WA_API_KEY` to a random secret with at least 32 characters in the Astro server environment, then run `npm run wa:server`. The server binds to `127.0.0.1` by default. Keep the WhatsApp session files outside the repository.

## WhatsApp gateway

Copy `.env.example` to `.env` and set `SUPABASE_URL` plus `SUPABASE_KEY` to the project URL and server-only service-role key. Never use the service-role key in browser code or commit it. The gateway records incoming text-message metadata in `public.messages`; it does not download media content. Apply `../supabase/migrations/20261027000008_whatsapp_messages.sql` before connecting WhatsApp.

The HTTP gateway listens on `PORT` (or legacy `WA_PORT`) and accepts Indonesian mobile numbers beginning with `628` and messages up to 4096 characters. The API key is required. `WA_HOST` defaults to `127.0.0.1`; keep it bound to localhost and expose it through ngrok rather than binding the gateway directly to the network.

To connect Supabase to the local gateway:

1. Install and authenticate the ngrok CLI, then copy `.env.example` to `.env`. Configure `SUPABASE_URL`, the server-only `SUPABASE_KEY`, and a random `WA_API_KEY` of at least 32 characters.
2. Start the gateway with `npm run wa:server` (or `node index.js` from the repository root). Scan the displayed WhatsApp QR code if this session has not been linked.
3. In another terminal, run `npm run wa:tunnel`. Copy the HTTPS forwarding URL shown by ngrok.
4. In the linked Supabase project, set Edge Function secrets using the ngrok URL and the exact same API key configured in the gateway: `supabase secrets set WA_GATEWAY_URL=https://<your-ngrok-domain> WA_API_KEY=<your-random-secret>`.
5. Redeploy `create-guest-order` if it is not already deployed, then place a test order and check its function logs.

The free ngrok URL can change when its tunnel restarts; update the `WA_GATEWAY_URL` secret each time it changes. Keep both terminals running while Supabase needs to send messages. Do not share or commit the service-role key, gateway API key, or Baileys session files.

WhatsApp session files stay in the existing `auth_info_baileys` directory outside this project. Set `WA_AUTH_DIR` to use a different session location. Do not copy or commit session credentials.

`npm run wa:connect` starts only the WhatsApp connection and QR display without starting the HTTP API. Do not run it at the same time as `npm run wa:server`, since both use the same WhatsApp session.

## Routes

- `/` — guest tenant directory
- `/tenant/<slug>` — guest menu and checkout
- `/cek-pesanan` — token-based order tracking
- `/tenant/login` — tenant owner login
- `/tenant/<slug>/dashboard` — tenant dashboard
- `/admin/login` — administrator login
- `/admin/dashboard` — existing administrator CRUD dashboard
