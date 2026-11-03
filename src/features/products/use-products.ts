import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchCategories,
  fetchProduct,
  fetchProducts,
} from "@/api/endpoints/products";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";

const PAGE_SIZE = 20;

export function useInfiniteProducts({
  search,
  categoryId,
}: {
  search: string;
  categoryId: string | null;
}) {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useInfiniteQuery({
    queryKey: queryKeys.products(businessId, { search, categoryId }),
    queryFn: ({ pageParam }) =>
      fetchProducts({
        page: pageParam,
        perPage: PAGE_SIZE,
        search,
        categoryId,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page
        ? lastPage.current_page + 1
        : undefined,
    enabled: Boolean(businessId) && has("products.view"),
  });
}

export function useCategories() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.categories(businessId),
    queryFn: fetchCategories,
    enabled: Boolean(businessId) && has("products.view"),
    staleTime: 10 * 60 * 1_000,
  });
}

export function useProduct(productId: string | null) {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useQuery({
    queryKey: queryKeys.product(businessId, productId ?? ""),
    queryFn: () => fetchProduct(productId as string),
    enabled: Boolean(businessId) && Boolean(productId) && has("products.view"),
  });
}
