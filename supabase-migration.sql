-- Opticon tables (shared Supabase project with Spark)

-- Watchlists
create table if not exists watchlists (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  symbol text not null,
  added_at timestamptz default now(),
  unique(user_email, symbol)
);

create index if not exists idx_watchlists_email on watchlists(user_email);

-- Portfolio history (daily snapshots)
create table if not exists portfolio_history (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  total_value numeric not null,
  day_change numeric,
  snapshot_date date default current_date,
  holdings jsonb,
  unique(user_email, snapshot_date)
);

create index if not exists idx_portfolio_history_email on portfolio_history(user_email);
create index if not exists idx_portfolio_history_date on portfolio_history(snapshot_date desc);

-- Price alerts
create table if not exists alerts (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  symbol text not null,
  target_price numeric not null,
  direction text check (direction in ('above', 'below')),
  triggered boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_alerts_email on alerts(user_email);
create index if not exists idx_alerts_symbol on alerts(symbol);
