 "use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, LayoutGrid } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import { api } from "@/lib/axios";
import { SellerChannelCta } from "@/components/SellerChannelCta";
import {
  ProductCard,
  type ProductCardProps,
} from "@/components/ProductCard";

export type SimpleCategory = { id: number; name: string };
export type ProductCardDto = ProductCardProps;

type ProductCardListPageDto = {
  content: ProductCardDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};

export type CategoryProductSectionProps = {
  category: SimpleCategory;
  products: ProductCardDto[];
  titleOverride?: string;
};

export function CategoryProductSection({
  category,
  products,
  titleOverride,
}: CategoryProductSectionProps) {
  if (!products || products.length === 0) return null;

  const swiperRef = useRef<SwiperInstance | null>(null);

  return (
    <section className="mb-12">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white/90 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-[var(--primary)] hover:shadow-md">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3.5 md:px-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] md:text-lg">
            {titleOverride ?? category.name}
          </h2>
          <Link
            href={`/category/${category.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:text-[var(--accent)] md:text-base"
          >
            <span>Xem thêm</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="relative px-4 pb-4 md:px-6 md:pb-5">
          <Swiper
            modules={[Navigation, Autoplay]}
            className="home-slider"
            navigation={false}
            observer
            observeParents
            loop
            autoplay={{
              delay: 3500,
              disableOnInteraction: true,
              pauseOnMouseEnter: true,
            }}
            spaceBetween={16}
            slidesPerView={2.2}
            breakpoints={{
              640: { slidesPerView: 3, spaceBetween: 16 },
              768: { slidesPerView: 4, spaceBetween: 18 },
              1024: { slidesPerView: 5, spaceBetween: 20 },
            }}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
          >
            {products.map((p) => (
              <SwiperSlide key={p.productId}>
                <ProductCard {...p} />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="home-slider-nav">
            <button
              type="button"
              className="home-slider-nav-btn"
              onClick={() => swiperRef.current?.slidePrev()}
              aria-label="Sản phẩm trước"
            >
              <ArrowLeft
                className="h-4 w-4"
                strokeWidth={2.4}
                aria-hidden
              />
            </button>
            <button
              type="button"
              className="home-slider-nav-btn"
              onClick={() => swiperRef.current?.slideNext()}
              aria-label="Sản phẩm tiếp theo"
            >
              <ArrowRight
                className="h-4 w-4"
                strokeWidth={2.4}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const sellerUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_SELLER_URL ?? "http://localhost:3001"
      : process.env.NEXT_PUBLIC_SELLER_URL ?? "http://localhost:3001";
  const [rootCategories, setRootCategories] = useState<SimpleCategory[]>([]);
  const [leafCategories, setLeafCategories] = useState<SimpleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<
    Record<number, ProductCardDto[]>
  >({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [treeRes, leavesRes] = await Promise.all([
          api.get<Array<{ id: number; name: string }>>("/category/tree"),
          api.get<SimpleCategory[]>("/category/leaves"),
        ]);

        if (!cancelled) {
          const roots =
            (treeRes.data ?? []).map((node) => ({
              id: node.id,
              name: node.name,
            })) ?? [];
          setRootCategories(roots);
          setLeafCategories(leavesRes.data ?? []);

          if (roots.length > 0) {
            const limitedRoots = roots.slice(0, 6);
            const results = await Promise.all(
              limitedRoots.map(async (cat) => {
                try {
                  const res = await api.get<ProductCardListPageDto>(
                    "/product/list",
                    {
                      params: {
                        categoryId: cat.id,
                        page: 0,
                        size: 10,
                      },
                    },
                  );
                  const data = Array.isArray(res.data?.content)
                    ? res.data.content
                    : [];
                  return { id: cat.id, products: data };
                } catch {
                  return { id: cat.id, products: [] as ProductCardDto[] };
                }
              }),
            );

            if (!cancelled) {
              const map: Record<number, ProductCardDto[]> = {};
              for (const item of results) {
                map[item.id] = item.products;
              }
              setCategoryProducts(map);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError("Không tải được danh mục.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-[var(--muted-foreground)]">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Sidebar danh mục cha cao nhất */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div
          className="sticky flex flex-col gap-3 pr-1"
          style={{
            top: "calc(var(--header-height) + 1rem)",
            maxHeight: "calc(100vh - var(--header-height) - 2rem)",
          }}
        >
          {/* CTA Kênh bán hàng – tái sử dụng component chung */}
          <SellerChannelCta />

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-2 bg-[var(--primary)]/8 px-4 py-3">
              <LayoutGrid
                className="h-5 w-5 text-[var(--primary)]"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
                Danh mục
              </h2>
            </div>
            <div className="max-h-[calc(100vh-var(--header-height)-4rem)] overflow-y-auto p-2">
              <nav className="space-y-0.5">
                {rootCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.id}`}
                    className="group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                  >
                    <span className="truncate">{cat.name}</span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[var(--primary)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                ))}

                {rootCategories.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                    Chưa có danh mục.
                  </p>
                )}
              </nav>
            </div>
          </div>
        </div>
      </aside>

      {/* Nội dung chính */}
      <section className="flex-1 min-w-0">
        {/* Banner – 2 column */}
        <div className="mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href={sellerUrl}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm block group"
            >
              <Image
                src="/banner_main4.png"
                alt="Bán hàng cùng Chobbi"
                width={1024}
                height={572}
                className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                priority
              />
            </Link>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
              <Swiper
                modules={[Autoplay, Pagination]}
                slidesPerView={1}
                loop
                autoplay={{
                  delay: 2200,
                  disableOnInteraction: true,
                  pauseOnMouseEnter: true,
                }}
                pagination={{ clickable: true }}
                className="banner-secondary-slider"
              >
                <SwiperSlide>
                  <Image
                    src="/banner_thoitrangnam.png"
                    alt="Thời trang nam – Phong cách phái mạnh"
                    width={1024}
                    height={572}
                    className="h-auto w-full object-cover"
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <Image
                    src="/phone_banner2.png"
                    alt="Thời trang nam – banner điện thoại"
                    width={1024}
                    height={572}
                    className="h-auto w-full object-cover"
                  />
                </SwiperSlide>
              </Swiper>
            </div>
          </div>
        </div>

        {/* Các section danh sách sản phẩm theo danh mục (slider) */}
        {rootCategories.map((cat) => {
          const products = categoryProducts[cat.id] ?? [];
          if (!products.length) return null;
          return (
            <CategoryProductSection
              key={cat.id}
              category={cat}
              products={products}
            />
          );
        })}
      </section>
    </div>
  );
}

