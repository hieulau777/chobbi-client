/** API GET /shop/public/{shopId} */

export type PublicShopProfileDto = {
  id: number;
  name: string;
  avatar: string | null;
};

export type PublicShopBannerDto = {
  id: number;
  imagePath: string;
  sortOrder: number;
};

export type PublicShopCategoryRefDto = {
  id: number;
  name: string;
};

export type PublicShopProductDto = {
  id: number;
  name: string;
  thumbnail: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  totalStock: number;
  shopCategoryId: number | null;
};

export type PublicShopPageDto = {
  profile: PublicShopProfileDto;
  banners: PublicShopBannerDto[];
  shopCategories: PublicShopCategoryRefDto[];
  products: PublicShopProductDto[];
};

export type PublicShopProductListPageDto = {
  content: PublicShopProductDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};
