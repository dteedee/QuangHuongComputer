import client from './client';

// ---------------------------------------------------------------------------
// Enums / literals — bám sát Content.Domain.Promotion (Phase 04 luồng A)
// ---------------------------------------------------------------------------
export type PromotionType = 'Code' | 'Automatic' | 'FlashSale';
export type PromotionStatus = 'Draft' | 'Active' | 'Paused' | 'Expired';
export type DiscountType = 'Percent' | 'Fixed' | 'FreeShip' | 'BuyXGetY' | 'Tiered';

export type ConditionType =
  | 'MinOrderValue'
  | 'Category'
  | 'Brand'
  | 'Product'
  | 'CustomerGroup'
  | 'TimeOfDay'
  | 'DayOfWeek'
  | 'FirstOrder'
  | 'Quantity';

export type ConditionOperator = 'Eq' | 'Gte' | 'Lte' | 'In' | 'Between';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PromotionCondition {
  id?: string;
  type: ConditionType;
  operator: ConditionOperator;
  /** JSON serialized; rule handler tự parse. */
  valueJson: string;
}

export interface PromotionReward {
  id?: string;
  productId?: string | null;
  variantId?: string | null;
  productName?: string;
  quantity: number;
  /** 100 = tặng miễn phí, <100 = giảm phần trăm. */
  discountPercent: number;
}

export interface Promotion {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  type: PromotionType;
  status: PromotionStatus;
  startAt: string;
  endAt?: string | null;
  priority: number;
  isExclusive: boolean;
  isAutomatic: boolean;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  maxTotalUsage?: number | null;
  maxUsagePerCustomer?: number | null;
  currentUsage: number;
  storeId?: string | null;
  audienceTag?: string | null;
  conditions: PromotionCondition[];
  rewards: PromotionReward[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionListFilter {
  type?: PromotionType;
  status?: PromotionStatus;
  storeId?: string;
  search?: string;
}

export interface CreatePromotionDto {
  code?: string | null;
  name: string;
  description?: string | null;
  type: PromotionType;
  startAt: string;
  endAt?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  priority?: number;
  isExclusive?: boolean;
  isAutomatic?: boolean;
  maxTotalUsage?: number | null;
  maxUsagePerCustomer?: number | null;
  storeId?: string | null;
  audienceTag?: string | null;
  conditions?: PromotionCondition[];
  rewards?: PromotionReward[];
}

export type UpdatePromotionDto = Partial<CreatePromotionDto>;

// ---------------------------------------------------------------------------
// Pricing preview types
// ---------------------------------------------------------------------------
export interface EvaluateCartLine {
  productId: string;
  variantId?: string | null;
  productName?: string;
  categoryId?: string;
  brandId?: string;
  quantity: number;
  unitPrice: number;
}

export interface EvaluateRequest {
  /** Cart snapshot (không cần cartId nếu là preview). */
  cartId?: string | null;
  lines: EvaluateCartLine[];
  subtotal: number;
  shippingFee?: number;
  customerContext?: {
    customerId?: string | null;
    audienceTag?: string | null;
    isFirstOrder?: boolean;
    customerGroup?: string | null;
  };
  appliedCodes?: string[];
  /** Promotion draft chưa lưu — dùng khi admin preview. */
  draftPromotion?: CreatePromotionDto;
  now?: string;
}

export interface LineDiscount {
  productId: string;
  variantId?: string | null;
  amount: number;
  promotionId?: string;
  reason?: string;
}

export interface AppliedPromotionSummary {
  promotionId: string;
  code?: string | null;
  name: string;
  discountType: DiscountType;
  discountAmount: number;
}

export interface FreeGift {
  productId: string;
  variantId?: string | null;
  quantity: number;
  productName?: string;
}

export interface PricingResult {
  isApplicable: boolean;
  subtotal: number;
  lineDiscounts: LineDiscount[];
  orderDiscount: number;
  shippingDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  freeGifts: FreeGift[];
  appliedPromotions: AppliedPromotionSummary[];
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const BASE = '/promotions';

export const promotionsApi = {
  list: async (filter?: PromotionListFilter): Promise<Promotion[]> => {
    const res = await client.get<Promotion[]>(BASE, { params: filter });
    return res.data;
  },

  get: async (id: string): Promise<Promotion> => {
    const res = await client.get<Promotion>(`${BASE}/${id}`);
    return res.data;
  },

  create: async (dto: CreatePromotionDto): Promise<Promotion> => {
    const res = await client.post<Promotion>(BASE, dto);
    return res.data;
  },

  update: async (id: string, dto: UpdatePromotionDto): Promise<Promotion> => {
    const res = await client.put<Promotion>(`${BASE}/${id}`, dto);
    return res.data;
  },

  activate: async (id: string): Promise<void> => {
    await client.post(`${BASE}/${id}/activate`);
  },

  pause: async (id: string): Promise<void> => {
    await client.post(`${BASE}/${id}/pause`);
  },

  evaluate: async (req: EvaluateRequest): Promise<PricingResult> => {
    const res = await client.post<PricingResult>(`${BASE}/evaluate`, req);
    return res.data;
  },

  /** Mã khách dùng được (dùng cho checkout, không phải admin). */
  available: async (customerId?: string): Promise<Promotion[]> => {
    const res = await client.get<Promotion[]>(`${BASE}/available`, {
      params: customerId ? { customerId } : undefined,
    });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const formatDiscount = (p: Pick<Promotion, 'discountType' | 'discountValue' | 'maxDiscountAmount'>): string => {
  switch (p.discountType) {
    case 'Percent':
      return `-${p.discountValue}%${p.maxDiscountAmount ? ` (tối đa ${p.maxDiscountAmount.toLocaleString('vi-VN')}đ)` : ''}`;
    case 'Fixed':
      return `-${p.discountValue.toLocaleString('vi-VN')}đ`;
    case 'FreeShip':
      return 'Miễn phí vận chuyển';
    case 'BuyXGetY':
      return 'Mua X tặng Y';
    case 'Tiered':
      return 'Giảm theo bậc';
    default:
      return '';
  }
};

export const promotionStatusLabel: Record<PromotionStatus, string> = {
  Draft: 'Nháp',
  Active: 'Đang chạy',
  Paused: 'Tạm dừng',
  Expired: 'Hết hạn',
};

export const promotionTypeLabel: Record<PromotionType, string> = {
  Code: 'Mã nhập tay',
  Automatic: 'Tự động',
  FlashSale: 'Flash Sale',
};
