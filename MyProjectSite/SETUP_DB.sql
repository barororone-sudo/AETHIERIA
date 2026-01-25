-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Create the table for the Viral Spot
create table king_spot (
  id bigint primary key,
  name text,
  message text,
  claimed_at timestamptz default now()
);

-- 2. Insert the initial "Bot" King
insert into king_spot (id, name, message) 
values (1, 'System', 'Click to claim the throne!');

-- 3. Disable Row Level Security (Chaos Mode: Everyone can edit)
-- Usually risky, but for this specific "King of the Hill" game, it's the intended mechanic.
alter table king_spot enable row level security;

create policy "Enable read access for all users"
on king_spot for select
using (true);

create policy "Enable update access for all users"
on king_spot for update
using (true)
with check (true);

-- 4. Enable Realtime (So page updates automatically)
alter publication supabase_realtime add table king_spot;
