/**
 * Danh sách phương thức giao hàng và công thức tính phí (đồng bộ với seller và sql.txt).
 * Công thức: weightGram <= baseWeight → baseFee;
 *            weightGram > baseWeight → baseFee + ceil((weight - baseWeight) / weightStep) * extraFeePerStep
 */
export type ShippingMethod = {
  id: number;
  name: string;
  baseWeight: number;
  baseFee: number;
  weightStep: number;
  extraFeePerStep: number;
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 1, name: "Giao Hàng Nhanh", baseWeight: 500, baseFee: 25000, weightStep: 500, extraFeePerStep: 5000 },
  { id: 2, name: "Giao Hàng Tiết Kiệm", baseWeight: 1000, baseFee: 20000, weightStep: 500, extraFeePerStep: 3000 },
  { id: 3, name: "Giao Hàng Hỏa Tốc", baseWeight: 2000, baseFee: 50000, weightStep: 1000, extraFeePerStep: 15000 },
];

export function calcShippingFee(
  weightGram: number,
  baseWeight: number,
  baseFee: number,
  weightStep: number,
  extraFeePerStep: number
): number {
  if (weightGram <= 0) return baseFee;
  if (weightGram <= baseWeight) return baseFee;
  if (weightStep <= 0) return baseFee;
  const steps = Math.ceil((weightGram - baseWeight) / weightStep);
  return baseFee + steps * extraFeePerStep;
}
