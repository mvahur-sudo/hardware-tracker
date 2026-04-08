export type Role = 'SUPERADMIN' | 'IT_ADMIN' | 'EMPLOYEE';
export type Locale = 'en' | 'et';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  locale: Locale;
}

export interface AssetCategory {
  id: string;
  key: string;
  nameEn: string;
  nameEt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  serialNumber?: string | null;
  qrCodeValue: string;
  brand: string;
  model: string;
  status: string;
  condition: string;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  warrantyEndDate?: string | null;
  vendor?: string | null;
  location?: string | null;
  notes?: string | null;
  category: AssetCategory;
  currentAssignee?: { id: string; firstName: string; lastName: string; email: string } | null;
  assignments?: any[];
  maintenance?: any[];
}
