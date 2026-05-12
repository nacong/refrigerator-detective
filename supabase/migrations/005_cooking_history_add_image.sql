alter table public.cooking_history
  add column if not exists image_url text not null default '';
