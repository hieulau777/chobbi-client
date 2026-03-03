export type CheckoutDraftItem = {
  cartVariationId: number;
  variationId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  price: number;
  variationOptions?: { tierName: string; optionName: string }[];
};

export type CheckoutDraftShop = {
  shopId: number;
  shopName: string;
  items: CheckoutDraftItem[];
  shippingMethodId: number;
  shippingMethodName: string;
  shippingCost: number;
};

export type CheckoutDraft = {
  shops: CheckoutDraftShop[];
  totalProductAmount: number;
  totalShippingFee: number;
  totalAmount: number;
};

export const CHECKOUT_DRAFT_KEY = "chobbi_checkout_draft";

export function getCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function setCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
}
