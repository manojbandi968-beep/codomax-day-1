create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  category text not null default 'General' check (char_length(trim(category)) between 1 and 50),
  content text not null check (char_length(trim(content)) between 1 and 50000),
  image_url text,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Posts are publicly readable"
  on public.posts for select
  using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Authors can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_id_idx on public.posts (author_id);
