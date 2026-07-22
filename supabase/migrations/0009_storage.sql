insert into storage.buckets (id, name, public)
values ('cash-photos', 'cash-photos', false);

-- Path convention: <branch_id>/<date>/<uuid>.jpg — branch_staff can only write into their own branch's folder.
create policy cash_photo_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'cash-photos'
  and public.current_user_role() = 'branch_staff'
  and (storage.foldername(name))[1] = public.current_user_branch_id()::text
);

create policy cash_photo_read on storage.objects
for select to authenticated
using (
  bucket_id = 'cash-photos'
  and (
    public.current_user_role() in ('founder_admin', 'supervisor')
    or (storage.foldername(name))[1] = public.current_user_branch_id()::text
  )
);
