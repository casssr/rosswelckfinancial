# Rosswelck Financial — Banking Portal
## Complete Setup Guide

---

## Step 1: Run this SQL in Supabase → SQL Editor

```sql
-- ════════════════════════════════════════════
-- Rosswelck Financial — FULL DATABASE SCHEMA
-- Paste this into Supabase SQL Editor and Run
-- ════════════════════════════════════════════

-- Accounts table (users + admins)
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,
  name          text not null,
  role          text default 'user' check (role in ('user','admin')),
  balance       numeric(14,2) default 0,
  account_no    text unique,
  email         text,
  phone         text,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- Joint accounts
create table if not exists joint_accounts (
  id          uuid primary key default gen_random_uuid(),
  account_no  text unique not null,
  name        text not null,
  balance     numeric(14,2) default 0,
  owner1_id   uuid references accounts(id) on delete set null,
  owner2_id   uuid references accounts(id) on delete set null,
  created_at  timestamptz default now()
);

-- Transactions (individual + joint)
create table if not exists transactions (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid references accounts(id) on delete cascade,
  joint_account_id uuid references joint_accounts(id) on delete cascade,
  description      text,
  amount           numeric(14,2) not null,
  balance_after    numeric(14,2),
  type             text default 'credit',
  created_at       timestamptz default now()
);

-- Withdrawal requests
create table if not exists withdrawals (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid references accounts(id) on delete cascade,
  amount        numeric(14,2) not null,
  note          text,
  status        text default 'pending' check (status in ('pending','approved','rejected')),
  processed_by  uuid references accounts(id) on delete set null,
  processed_at  timestamptz,
  created_at    timestamptz default now()
);

-- Complaints / messages / deposit requests
create table if not exists complaints (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references accounts(id) on delete cascade,
  subject     text not null,
  message     text not null,
  status      text default 'open' check (status in ('open','resolved')),
  admin_reply text,
  created_at  timestamptz default now()
);

-- Activity log
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  type        text,
  description text,
  amount      numeric(14,2),
  actor_id    uuid references accounts(id) on delete set null,
  created_at  timestamptz default now()
);

-- ════════════════════════════════════════════
-- DISABLE Row Level Security (internal tool)
-- ════════════════════════════════════════════
alter table accounts      disable row level security;
alter table joint_accounts disable row level security;
alter table transactions  disable row level security;
alter table withdrawals   disable row level security;
alter table complaints    disable row level security;
alter table activity_log  disable row level security;

-- ════════════════════════════════════════════
-- SEED: Admin account + 2 demo users
-- ════════════════════════════════════════════
insert into accounts (username, password_hash, name, role, account_no, balance, email, phone)
values
  ('admin',   'admin123',  'Pat Calloway',  'admin', '0000000001', 0,       'admin@caldwellfinch.ng', '+234 800 000 0001'),
  ('jsmith',  'pass123',   'Jane Smith',    'user',  '1004778201', 5240.00, 'jane@example.com',       '+234 801 000 0001'),
  ('mtanaka', 'pass123',   'Miles Tanaka',  'user',  '1004779101', 1875.50, 'miles@example.com',      '')
on conflict (username) do nothing;

-- Seed opening transactions for demo users
insert into transactions (account_id, description, amount, balance_after, type)
select id, 'Opening balance', 5000.00, 5000.00, 'deposit' from accounts where username='jsmith'
on conflict do nothing;

insert into transactions (account_id, description, amount, balance_after, type)
select id, 'Payroll deposit', 240.00, 5240.00, 'deposit' from accounts where username='jsmith'
on conflict do nothing;

insert into transactions (account_id, description, amount, balance_after, type)
select id, 'Opening balance', 1875.50, 1875.50, 'deposit' from accounts where username='mtanaka'
on conflict do nothing;

-- Seed activity log
insert into activity_log (type, description)
values
  ('created', 'Account created for Jane Smith (jsmith)'),
  ('created', 'Account created for Miles Tanaka (mtanaka)')
on conflict do nothing;
```

---

## Step 2: Enable Storage for Profile Pictures

1. Go to **Storage** in the Supabase sidebar
2. Click **New bucket**
3. Name it: `avatars`
4. Check **Public bucket** → Save
5. Go to **Storage → Policies** → add policy:
   - Policy name: `Public read`
   - Allowed operation: `SELECT`
   - Policy definition: `true`
   - Repeat for `INSERT` and `UPDATE` with definition: `true`

---

## Step 3: File structure

Your project folder should look like this:

```
caldwell-finch/
├── index.html        ← Public homepage
├── login.html        ← Login page
├── dashboard.html    ← Customer dashboard
├── admin.html        ← Admin dashboard
├── style.css         ← All styles
├── config.js         ← Supabase connection + utilities
└── README.md         ← This file
```

---

## Step 4: Deploy to Netlify (free)

1. Go to **netlify.com** → Sign up free
2. Drag and drop your entire project folder onto the Netlify dashboard
3. Your site will be live at a URL like `https://your-site.netlify.app`
4. Optional: Add a custom domain in Netlify settings

---

## Demo accounts

| Role  | Username | Password |
|-------|----------|----------|
| Admin | admin    | admin123 |
| User  | jsmith   | pass123  |
| User  | mtanaka  | pass123  |

---

## Features

### Customer dashboard
- Balance overview with pending withdrawal summary
- Full transaction history
- Withdrawal requests (admin-reviewed)
- Deposit requests (admin-verified and credited)
- Joint account view (if linked by admin)
- Complaint/support form with admin reply
- Profile page (read-only, contact admin to update)

### Admin dashboard
- Live activity feed
- Withdrawal approval/rejection with balance update
- Deposit request verification and crediting
- Complaint inbox with reply and resolve
- All accounts with edit, balance adjust, delete
- Profile picture upload for any account
- Joint account creation (link two holders)
- Full transaction ledger across all accounts
- Add new accounts with opening balance + avatar

---

## Important notes

- Passwords are stored as plain text — fine for an internal tool, **never do this for a public product**
- This uses Supabase anonymous key — all data is visible to anyone with the key. Add Row Level Security if you open this publicly.
- Profile pictures are stored in Supabase Storage (public bucket)
