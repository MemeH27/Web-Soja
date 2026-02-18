-- Create Products Table
create table public.products (
  id text primary key,
  name text not null,
  price numeric not null,
  image text,
  category text not null check (category in ('food', 'drink')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.products enable row level security;

-- Create Policy to allow read access to everyone
create policy "Enable read access for all users" on public.products
  for select using (true);

-- Create Reviews Table
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  author text not null,
  meta text,
  time_text text,
  rating integer check (rating >= 1 and rating <= 5),
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Reviews
alter table public.reviews enable row level security;

-- Create Policy for Reviews
create policy "Enable read access for all users" on public.reviews
  for select using (true);
