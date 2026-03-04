export type InvoiceCategory =
  | 'Travel & Transport'
  | 'Utilities'
  | 'Materials & Supplies'
  | 'Subscriptions & Software'
  | 'Professional Services'
  | 'Food & Entertainment'
  | 'Equipment'
  | 'Marketing'
  | 'Other';

export interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
}

export interface Invoice {
  id: string;
  user_id: string;
  supplier: string | null;
  description: string | null;
  invoice_date: string | null;
  amount: number | null;
  vat_amount: number | null;
  products_services: string | null;
  business_name: string | null;
  image_url: string | null;
  image_path: string | null;
  raw_ocr_data: Record<string, unknown> | null;
  original_ocr_values: Record<string, unknown> | null;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  source: 'camera' | 'upload' | 'email';
  is_paid: boolean | null;
  payment_method: 'cash' | 'card' | 'eft' | null;
  category: InvoiceCategory | null;
  line_items: LineItem[] | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OCREdit {
  id: string;
  invoice_id: string;
  user_id: string;
  field_name: string;
  original_value: string | null;
  edited_value: string | null;
  edit_type: 'correction' | 'addition' | 'deletion';
  created_at: string;
}

export interface EmailInvoice {
  id: string;
  invoice_id: string | null;
  user_id: string;
  message_id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  received_at: string | null;
  processed_at: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  attachment_count: number;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface OCRAccuracyStats {
  field_name: string;
  total_edits: number;
  invoices_affected: number;
  accuracy_percentage: number;
}

export interface AdminDashboardStats {
  total_users: number;
  total_invoices: number;
  invoices_this_week: number;
  total_email_invoices: number;
  total_ocr_edits: number;
}

export interface InvoiceFormData {
  supplier: string;
  description: string;
  invoice_date: string;
  amount: string;
  vat_amount: string;
  products_services: string;
  business_name: string;
}

export interface OCRResult {
  supplier: string | null;
  description: string | null;
  invoice_date: string | null;
  amount: number | null;
  vat_amount: number | null;
  products_services: string | null;
  business_name: string | null;
  confidence: number;
  category: InvoiceCategory | null;
  line_items: LineItem[];
  raw_response: string;
}

export interface InvoiceFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'created_at' | 'invoice_date' | 'amount' | 'supplier';
  sortOrder: 'asc' | 'desc';
}
