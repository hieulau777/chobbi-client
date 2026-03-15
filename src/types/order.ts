export type MyOrderItemDto = {
  productId: number | null;
  variationId: number | null;
  productName: string | null;
  productThumbnail: string | null;
  variationName: string | null;
  quantity: number;
  price: number;
};

export type MyOrderShopDto = {
  orderId: number;
  shopId: number | null;
  shopName: string | null;
  shippingName: string | null;
  totalPrice: number;
  shippingCost: number;
  status: string | null;
  items: MyOrderItemDto[];
};

export type MyOrderDto = {
  orderGroupId: number;
  orderGroupCode: string | null;
  totalAmount: number;
  subTotal: number;
  createdAt: string;
  shops: MyOrderShopDto[];
};

export type MyOrderStatusTab = "ALL" | "PENDING" | "SHIPPED" | "CANCELED";

