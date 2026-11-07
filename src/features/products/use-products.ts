import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createProduct,
  fetchCategories,
  fetchProduct,
  fetchProducts,
} from "@/api/endpoints/products";
import { queryKeys } from "@/lib/query-keys";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { cacheCategories } from "@/services/offline-cache";

const PAGE_SIZE = 20;

export function useInfiniteProducts({
  search,
  categoryId,
  activeOnly = false,
}: {
  search: string;
  categoryId: string | null;
  /** The register only sells active products. */
  activeOnly?: boolean;
}) {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  return useInfiniteQuery({
    queryKey: queryKeys.products(businessId, { search, categoryId, activeOnly }),
    queryFn: ({ pageParam }) =>
      fetchProducts({
        page: pageParam,
        perPage: PAGE_SIZE,
        search,
        categoryId,
        isActive: activeOnly ? true : undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page
        ? lastPage.current_page + 1
        : undefined,
    enabled: Boolean(businessId) && has("products.view"),
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCategories() {
  const { has } = usePermissions();
  const { businessId } = useTenant();

  const query = useQuery({
    queryKey: queryKeys.categories(businessId),
    queryFn: fetchCategories,
    enabled: Boolean(businessId) && has("products.view"),
    staleTime: 10 * 60 * 1_000,
  });

  useEffect(() => {
    if (businessId && query.data) {
      void cacheCategories(businessId, query.data);
    }
  }, [businessId, query.data]);

  return query;
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
