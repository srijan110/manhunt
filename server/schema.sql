// SQL Schema for Real Manhunt Game
// Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Games table
create table games (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  host_id uuid not null,
  zone_polygon_json jsonb not null,
  shrink_rate integer default 5,
  current_round integer default 1,
  status varchar(20) default 'waiting',
  reveal_radius integer default 300,
  sabotage_cooldown integer default 60000,
  zone_shrink_interval integer default 60000,
  created_at timestamp default now(),
  started_at timestamp
);

-- Players table
create table players (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid not null,
  display_name varchar(100) not null,
  role varchar(10) default 'hunted',
  position jsonb,
  gps_accuracy float,
  last_seen timestamp default now(),
  sabotage_cooldown_until timestamp,
  hunter_gps_disabled_until timestamp,
  false_lead_until timestamp,
  is_eliminated boolean default false,
  eliminated_at timestamp,
  created_at timestamp default now()
);

-- Sabotage logs table
create table sabotage_logs (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  from_player_id uuid references players(id) on delete set null,
  to_player_id uuid references players(id) on delete set null,
  type varchar(20) not null,
  duration integer default 10000,
  created_at timestamp default now()
);

-- Events table (for notifications)
create table events (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  type varchar(50) not null,
  payload jsonb,
  created_at timestamp default now()
);

-- Clues table
create table clues (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade,
  hunter_id uuid references players(id) on delete cascade,
  position jsonb not null,
  created_at timestamp default now()
);

-- Create indexes for performance
create index idx_players_game_id on players(game_id);
create index idx_players_user_id on players(user_id);
create index idx_players_role on players(role);
create index idx_players_position on players using gin(position);
create index idx_events_game_id on events(game_id);
create index idx_events_player_id on events(player_id);
create index idx_sabotage_logs_game_id on sabotage_logs(game_id);

-- Enable Row Level Security (optional, for production)
-- alter table games enable row level security;
-- alter table players enable row level security;
-- alter table events enable row level security;
-- alter table sabotage_logs enable row level security;