-- Create a new private bucket for inspection audio
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values ('inspection-audio', 'inspection-audio', false, false, 26214400, array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'])
on conflict (id) do nothing;

-- Set up security policies for the bucket
-- Allow authenticated users to insert objects into the bucket
drop policy if exists "Authenticated users can upload audio" on storage.objects;
create policy "Authenticated users can upload audio"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'inspection-audio' );

-- Allow users to read objects they own (created)
drop policy if exists "Users can view audio they uploaded" on storage.objects;
create policy "Users can view audio they uploaded"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'inspection-audio' and owner = auth.uid() );
