// Hand-written domain types standing in for generated Supabase types (see database.types.ts placeholder note).
// Keep these in sync with the schema manually until `supabase gen types` can run (needs local Docker).

export type UserRole = 'branch_staff' | 'commissary_staff' | 'founder_admin' | 'supervisor'
export type ProductSize = 'regular' | 'junior'
export type CatalogStatus = 'active' | 'discontinued'
export type DiscountType = 'none' | 'senior' | 'pwd' | 'promo' | 'other'

export interface Branch {
  id: string
  name: string
  closing_time: string | null
  is_active: boolean
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole | null
  branch_id: string | null
  is_active: boolean
}

export interface Product {
  id: string
  flavor_name: string
  size: ProductSize
  status: CatalogStatus
  sort_order: number | null
}

export interface Promo {
  id: string
  name: string
  rate: number
  status: CatalogStatus
}

export interface Bundle {
  id: string
  name: string
  price: number
  status: CatalogStatus
}

export interface BundleComponent {
  id: string
  bundle_id: string
  product_id: string
  qty_per_bundle: number
}

export interface SaleTallyInsert {
  date: string
  branch_id: string
  product_id: string
  qty_sold: number
  discount_type: DiscountType
  promo_id?: string | null
  manual_discount_rate?: number | null
  discount_reason?: string | null
  entered_by: string
}

export interface BundleSaleInsert {
  date: string
  branch_id: string
  bundle_id: string
  qty_bundles_sold: number
  entered_by: string
}

export interface DeliveryInsert {
  date: string
  branch_id: string
  product_id: string
  qty: number
  entered_by: string
}

export interface EndOfDayDispositionInsert {
  date: string
  branch_id: string
  product_id: string
  qty_wasted: number
  reason?: string | null
  qty_carried_forward: number
  notes?: string | null
  explanation?: string | null
  entered_by: string
}

export interface BranchTodayStockRow {
  product_id: string
  flavor_name: string
  size: ProductSize
  carryover_in: number
  shipped_in: number
  available: number
  sold_today: number
  remaining_estimate: number
}

export interface DailyCashEntryInsert {
  date: string
  branch_id: string
  cash_counted: number
  digital_payments: number
  cash_photo_path?: string | null
  notes?: string | null
  explanation?: string | null
  entered_by: string
}
