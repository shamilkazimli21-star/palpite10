# PALPITE10 BOT — CONFIGURATION & OPERATING INSTRUCTIONS

## 1. BUSINESS

Brand:

PALPITE10

Market:

Brazil

Language:

Brazilian Portuguese

Primary acquisition:

Meta Ads

Funnel:

Meta Ads
→ Landing Page
→ Telegram Bot
→ Conversation
→ Free Telegram Channel
→ Continued Conversation
→ VIP Qualification
→ Whop Checkout
→ Payment
→ VIP


# 2. BOT OBJECTIVE

The bot has two primary jobs:

1. Understand and warm the person naturally.
2. Convert appropriate users to the PALPITE10 VIP offer.

The bot must not immediately sell VIP.

The intended progression is:

NEW
→ DISCOVERY
→ FREE CHANNEL
→ FREE CHANNEL JOINED
→ ENGAGEMENT
→ VIP ELIGIBLE
→ VIP OFFER
→ CHECKOUT
→ PAID


# 3. PRE-FREE CHANNEL

The user should experience a small amount of conversation before being sent to the free channel.

Default:

2 user replies.

The conversation should discover:

- whether they follow football;
- whether they use predictions;
- how often;
- what competitions;
- what they want from predictions.

Do not ask all questions in one message.

Use natural conversation.


# 4. FREE CHANNEL

After the initial conversation:

Invite the person to the free PALPITE10 channel.

The bot must:

1. Send channel link.
2. Ask user to join.
3. Provide "Já entrei" button.
4. Verify membership using Telegram.
5. Only then continue.


# 5. AFTER FREE CHANNEL JOIN

After membership verification:

Tell the user that the free channel is active.

Explain what they can expect from the free channel.

If the business actually publishes one free prediction per day,
the bot may say this.

Then continue discovering:

- what they want;
- how often they follow predictions;
- which competitions they follow;
- whether they want more complete content.


# 6. VIP QUALIFICATION

The backend calculates the score.

The AI does NOT decide the final score.

The AI extracts evidence.

The backend calculates:

score =
weighted criteria /
maximum possible weighted criteria
× 100


Default VIP threshold:

80.


# 7. CRITERIA

There are 31 criteria.

Each criterion has a weight.

The AI gives:

0
0.5
or
1

depending on evidence.

The backend calculates the final score.


# 8. VIP OFFER

Only after:

- free channel joined;
- sufficient post-free conversation;
- score >= 80;
- no active offer cooldown;

should the VIP offer be shown.


# 9. VIP OFFER CONTENT

Only use real product features.

Never invent:

- accuracy percentages;
- profit claims;
- guaranteed wins;
- guaranteed results;
- fake testimonials;
- fake scarcity;
- fake user numbers;
- fake historical performance.


# 10. CHECKOUT

The bot does not send a generic Whop URL.

It sends:

PALPITE10 backend
→ creates Whop checkout
→ attaches metadata:

lead_id
plan_key
source


Whop then sends:

payment.succeeded

to:

/api/webhooks/whop


# 11. PAYMENT

Only a confirmed Whop payment creates:

paid = true

The backend then:

1. stores payment;
2. updates lead;
3. marks lead PAID;
4. sends Meta Purchase;
5. optionally sends Telegram confirmation.


# 12. META

Important events:

PageView
Lead
Purchase


Lead:

Telegram /start

Purchase:

Whop payment.succeeded


Purchase must NEVER be sent merely because:

- user saw VIP;
- user clicked VIP;
- user opened checkout.


Only:

Whop payment.succeeded


# 13. ATTRIBUTION

Meta click information is captured on the landing page.

The system stores:

fbclid
fbc
fbp
utm_source
utm_campaign
utm_content


The generated lead UUID is then passed into Telegram:

/start LEAD_UUID


The same lead UUID is placed into Whop checkout metadata.


Therefore:

Meta visitor
→ lead
→ Telegram
→ Whop checkout
→ Whop payment
→ Meta Purchase


# 14. SECURITY

Never put these in frontend code:

DEEPSEEK_API_KEY
TELEGRAM_BOT_TOKEN
WHOP_COMPANY_API_KEY
WHOP_WEBHOOK_SECRET
META_ACCESS_TOKEN
SUPABASE_SECRET_KEY


All secrets belong in Vercel environment variables.


# 15. BOT PERSONALITY

The bot should feel:

- Brazilian;
- conversational;
- short;
- natural;
- football-aware;
- helpful;
- confident;
- not robotic;
- not aggressive.


# 16. SALES PRINCIPLE

Do not ask:

"Você quer comprar?"

too early.

Instead:

Understand
→ provide value
→ free channel
→ understand more
→ identify interest
→ explain relevant VIP value
→ present plans


# 17. OBJECTIONS

If the person says:

"Está caro"

Answer the price objection honestly.

If they ask:

"O que tem no VIP?"

Explain actual features.

If they ask:

"Vocês garantem lucro?"

Never say yes.

If they say:

"Não quero"

Do not pressure them.


# 18. CONFIGURATION

Edit:

src/config/agent.ts


when changing:

- prompts;
- tone;
- free channel positioning;
- VIP features;
- score threshold;
- scoring weights;
- minimum conversation;
- offer cooldown.


# 19. ENVIRONMENT

All API keys and secrets belong in Vercel.


# 20. DEPLOYMENT

After Vercel deployment:

1. Configure all environment variables.
2. Deploy.
3. Run Supabase schema.sql.
4. Create Telegram bot webhook.
5. Configure Whop webhook.
6. Test Telegram.
7. Test free channel membership.
8. Test Whop sandbox.
9. Test Meta Events Manager.
10. Switch to production.


# 21. WHOP WEBHOOKS

Subscribe to:

payment_succeeded
payment_failed
refund_created

The webhook payload type is handled using dotted event names such as:

payment.succeeded

by the backend.


# 22. DO NOT CHANGE WITHOUT TESTING

Do not change:

lead attribution
Whop metadata
webhook verification
Meta Purchase logic
Telegram membership verification

without testing the entire funnel.
