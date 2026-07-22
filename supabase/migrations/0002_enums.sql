create type public.user_role as enum ('branch_staff', 'commissary_staff', 'founder_admin', 'supervisor');
create type public.catalog_status as enum ('active', 'discontinued');
create type public.product_size as enum ('regular', 'junior');
create type public.discount_type as enum ('none', 'senior', 'pwd', 'promo', 'other');
create type public.threshold_metric as enum ('cash_variance', 'shrinkage');
