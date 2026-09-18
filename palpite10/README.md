# PALPITE10

Meta Ad → landing page → Telegram bot (AI salesperson, pt-BR) → free channel → VIP offer → Whop checkout → Whop webhook → VIP access + Meta Purchase — with follow-ups and a supervised learning loop.

```
Meta Ad ─► Landing (/) ─► /api/lead/start ─► t.me/bot?start=<token>
                                   │ Contact (Pixel + CAPI, same event id) → Lead when the bot is started
Telegram ─► /api/telegram/webhook ─► sales engine (DeepSeek proposes, backend decides)
             ├─ free channel invite ─► join verified by Telegram (button or automatic)
             ├─ VIP offer ─► /api/checkout/redirect ─► Whop checkout (lead id in metadata)
Whop ─► /api/webhooks/whop ─► payment stored ─► single-use VIP invite ─► Meta Purchase ─► admin alert
Cron ─► /api/cron/followups (daily)   /api/cron/learning (daily: analyse → coach → proposal → /approve)
```

## Deploy (about 20 minutes)

1. **GitHub** – create the repo `palpite10`, upload these files, push.
2. **Supabase** – new project → SQL Editor → paste `supabase/schema.sql` → Run. Copy the project URL and the **secret** key (Settings → API).
3. **Telegram**
   - @BotFather → `/newbot` → token + username.
   - Add the bot as **administrator** of the free channel **and** the VIP channel (VIP needs "Invite users via link" and "Ban users").
   - Channel IDs: forward a channel post to @userinfobot / @getidsbot (`-100…`). Your own ID (for `TELEGRAM_ADMIN_CHAT_ID`): @userinfobot.
   - Send `/start` to your bot once from your own account so it is allowed to message you.
4. **Whop**
   - Developer → API keys → company key that can create checkout configurations → `WHOP_API_KEY`.
   - For each plan copy the plan ID (`plan_…`) or its checkout link into `WHOP_PLAN_WEEKLY / MONTHLY / 3_MONTHS`.
   - Developer → Webhooks → `https://YOUR-DOMAIN/api/webhooks/whop`, events: `payment.succeeded`, `payment.failed`, `refund.created`, `membership.activated`, `membership.deactivated`. Copy the secret (`ws_…`) → `WHOP_WEBHOOK_SECRET`.
   - If you also installed Whop's own Telegram app for the VIP channel, remove it or let it be the only one managing access — two systems kicking/inviting the same people conflict.
5. **Vercel** – import the repo, paste every variable from `.env.example` **before** the first deploy, deploy. After changing any variable: Deployments → Redeploy.
6. **Connect Telegram** – open `https://YOUR-DOMAIN/api/setup/telegram?secret=YOUR_SETUP_SECRET`. It registers the webhook and returns a checklist (database, bot admin rights in both channels, Whop plans, Meta, support contact). Fix anything listed in `needs_attention` and open it again.
7. **Meta** – set `META_TEST_EVENT_CODE`, redeploy, click through the funnel, watch Events Manager → Test events (`Contact` = tapped the button on the site, `Lead` = started the bot, `CompleteRegistration` = joined the free channel (verified), `VipOfferShown`, `InitiateCheckout`, `Purchase` with value). Then delete the test code and redeploy. Ad URL parameters: `utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`.
8. **Test a purchase** end to end with a real card on the weekly plan, then refund it in Whop — the bot must deliver the VIP link, and remove access after the refund.

`/api/health?secret=SETUP_SECRET` tells you which variable is wrong (names only, never values).

## Free plans: what to know

- **Vercel Hobby** runs cron jobs once per day: learning at 06:00 and follow-ups at 12:00 Brasília (`vercel.json`). For hourly follow-ups (a "you opened the checkout 3 hours ago" nudge needs that) run `supabase/optional_hourly_cron.sql` — free, 2 minutes.
- **Supabase Free** pauses a project after a week with no activity. The daily crons count as activity.
- Vercel Hobby is for non-commercial use per Vercel's terms; move to Pro when this makes money.

## Where to change things

| What | File |
|---|---|
| Facts the bot may state (benefits, prices, track record, testimonials, refund policy, tone) | `src/config/business.ts` |
| Funnel rules, score weights, offer timing, follow-up schedule and texts | `src/config/funnel.ts` |
| Sales / analyst / coach prompts | `src/config/prompts.ts` |
| Forbidden claims filter | `src/sales/guardrails.ts` |

The bot can only state what is in `business.ts`. `null` = "I'll confirm with the team". **`refundPolicy` and `activePromotion` are still `null` — fill them in.**

### Track record and testimonials — read this

`business.ts` contains the result numbers and the two testimonials you sent. The bot quotes them only when someone asks about results/trust, always with the period and always followed by "resultado passado não garante resultado futuro". Hit rate and ROI are **computed from the counts** (voids excluded), so every period uses the same formula; any other percentage near words like "acerto/lucro/ROI" is blocked by the filter. Keep these entries **only if they are real and you can show the record / the customer agreed to be quoted**. If they were placeholders, set `trackRecord: null` and `testimonials: []` — invented results or testimonials are illegal advertising in Brazil and get Meta ad accounts banned.

## How the selling works

- The AI returns JSON: reply + proposed action + evidence signals. **The backend decides**: free invite only after 2 replies (forced at 4), proactive VIP offer only after the person joined the free channel, replied twice more and reached score 60, max 2 proactive offers, 72 h apart. A direct question about price/VIP always gets the plans, at any stage.
- Every outgoing message passes the claims filter (guarantees, fake scarcity, invented numbers/promotions, chasing losses, raw links). One rewrite, then a safe fallback + alert to you.
- Minors and people showing gambling-harm signs are flagged `do_not_sell`: no offers, no follow-ups, checkout blocked.
- The bot says it is a virtual assistant when asked, and hands over to `SUPPORT_USERNAME` on request.
- Plans are presented as what they are: subscriptions that renew automatically until cancelled.
- Follow-ups: max 6 per person, max 2 without a reply, 09:00–21:00 Brasília, each step once, "PARAR" stops everything.

## How it learns (nothing changes without you)

```
conversation ends (paid · said no · 7 days silent) → analyst (1 AI call) → every 10 analyses the coach
drafts a new playbook (max 3 guideline changes, safety-checked) → you get it in Telegram →
/playbook N to read → /approve N or /reject N → only then production behaviour changes
```

A/B tests run in parallel: only new leads are enrolled, 50/50 by hash, a winner needs ≥50 exposed people per variant **and** p < 0.05; winners are locked into the playbook. Two tests are seeded (opening question; VIP bridge). The coach's test ideas arrive as drafts → `/activate N`.

## Admin panel — `/admin` (Turkish interface)

Open `https://YOUR-DOMAIN/admin`. Password = `ADMIN_PASSWORD` (or `SETUP_SECRET` if you did not set one). One-time setup: run `supabase/admin_panel.sql` in the Supabase SQL Editor (adds the table for your conversation ratings).

| Tab | What you do there |
|---|---|
| Genel Bakış | Funnel, conversion per step, campaigns, objections, latest payments, things waiting for you |
| Konuşmalar | Read every conversation, translate it to Turkish, **rate the bot 1–5 with a note** (fed to the Sales Coach as its strongest evidence), write as the bot, mark "needs human", stop selling to a person |
| İşletme Bilgileri | Every fact the bot may state: channels, VIP benefits, plans and prices, track record, testimonials, promotion, refund policy, tone, "never say" |
| Satış Asistanı | Edit the sales prompt blocks and per-stage instructions, see the locked safety rules, **test chat** against the real agent without Telegram |
| Kurallar ve Puanlama | Invite/offer timing, score threshold, follow-up schedule and texts, lead-score weights |
| Öğrenme | Approve / reject Coach proposals (with a diff), edit the live playbook, create / start / stop A/B tests, run the learning cycle now |
| Ödemeler | All Whop payments; link an unmatched payment to a Telegram ID (delivers VIP) |
| Sistem | Health of every integration, re-register the Telegram webhook, send due follow-ups now, failed webhooks |

How it works: `src/config/*` are the defaults; whatever you save in the panel is stored in Supabase (`app_state` → `settings`) and applied on top at runtime by `src/lib/settings.ts` — live in ~30 seconds, no redeploy. "Varsayılana dön" removes your override. Saved texts containing guarantees / fake urgency are rejected, and the non-negotiable safety rules of the prompt are intentionally not editable.

Files: `app/admin/page.tsx` (UI), `app/api/admin/route.ts` (API + login), `src/lib/settings.ts` (settings layer).

## Support tickets, audio, screenshots (Telegram, owner side in English)

One-time setup: run `supabase/support_and_cleanup.sql` in the Supabase SQL Editor.

- **Audio / voice / video note** → the bot answers "não consigo ouvir áudio… manda por texto".
- **Screenshot (photo or image file)** → the bot tells the customer it was passed to the team, copies the image to `TELEGRAM_ADMIN_CHAT_ID` with buttons, and the AI goes quiet for that person. The same happens when the AI decides a human is needed.
- **✍️ Reply** (or just reply to the message in Telegram) → write in any language; the customer receives it in Brazilian Portuguese and you see what was sent. Start with `!` to send your text untouched.
- The customer's answers come back to you with an English translation and "Solved?".
- **✅ Solved** → the AI takes over again. A ticket untouched for 12 h is released automatically (configurable in the panel) so nobody is left waiting while you sleep; replying to it re-opens it.
- **🧠 Teach the AI** → describe issue + solution in any language; it becomes a knowledge entry injected into the sales prompt, so the bot solves that case alone next time. Manage entries in `/admin` → Satış Asistanı.

## Data retention (free Supabase = 500 MB)

Every day, after conversations were analysed, `purge_old_data()` deletes chat texts older than 30 days (only for analysed conversations), raw event logs, webhook payloads and old checkout links. Kept forever: leads, scores, profiles, payments, analyses, your ratings, playbooks, learning rounds, experiments, bot knowledge, settings. Days are editable in the panel; usage and a "clean now" button are in `/admin` → Sistem.

## Admin commands (from `TELEGRAM_ADMIN_CHAT_ID`)

`/stats [days]` `/funnel` `/campaigns [days]` `/objections [days]` · `/playbook [N]` `/proposals` (or `/playbooks`) `/approve N` `/reject N` · `/experiments` `/activate N` `/stopexp N` · `/learn` `/followups` · `/say <telegram_id> <text>` `/done <telegram_id>` `/link <payment_id> <telegram_id>` · `/help`

You also get alerts for: new sale / renewal / refund / VIP ended, a person asking for a human, a risk flag, someone in the VIP channel without a membership, an unlinked payment, any webhook failure.

## Local development

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev                  # Telegram needs a public https URL → use a tunnel, then open /api/setup/telegram?secret=...
npm run typecheck && npm run build
```
