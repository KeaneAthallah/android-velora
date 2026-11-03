import { create, isAxiosError, type AxiosError, type AxiosRequestConfig } from "axios";
import { API_BASE_URL, API_CONFIGURED, API_DEBUG } from "@/config/env";
import { getTenantContext } from "@/services/api-context";
import { getToken } from "@/services/token-store";

/** `{ success, message, data, meta }` — every Laravel response uses it. */
export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
  code?: string;
  request_id?: string;
};

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly isApiError = true;
  readonly status?: number;
  readonly code?: string;
  readonly fieldErrors?: FieldErrors;

  constructor(payload: {
    message: string;
    status?: number;
    code?: string;
    fieldErrors?: FieldErrors;
  }) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.fieldErrors = payload.fieldErrors;
  }
}

const client = create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: "application/json" },
});

type UnauthorizedHandler = (error: ApiError) => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();

/** Notified when an authenticated request comes back 401. */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

const PUBLIC_AUTH_PATHS = new Set(["/auth/login", "/auth/register"]);

function isPublicAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.has(url.split("?")[0]);
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);

  const tenant = getTenantContext();
  if (tenant.businessId) config.headers.set("X-Business-Id", tenant.businessId);
  if (tenant.outletId) config.headers.set("X-Outlet-Id", tenant.outletId);

  return config;
});

function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiEnvelope<unknown>>>;

    if (!axiosError.response) {
      const detail = API_DEBUG ? axiosError.message : null;
      return new ApiError({
        message:
          detail ??
          "Cannot reach the Velora server. Check your connection and API address.",
        code: "NETWORK_ERROR",
      });
    }

    const body = axiosError.response.data;
    const status = axiosError.response.status;
    return new ApiError({
      message:
        body?.message?.trim() ||
        (status >= 500
          ? "The server ran into a problem. Try again."
          : `Request failed (${status}).`),
      status,
      code: body?.code ?? `HTTP_${status}`,
      fieldErrors: body?.errors,
    });
  }

  return new ApiError({
    message: error instanceof Error ? error.message : "Something went wrong.",
  });
}

client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized.status === 401) {
      const url = (error as AxiosError | undefined)?.config?.url;
      if (!isPublicAuthPath(url)) {
        for (const handler of unauthorizedHandlers) {
          try {
            handler(normalized);
          } catch {
            /* a broken listener must not hide the error */
          }
        }
      }
    }
    return Promise.reject(normalized);
  },
);

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

/**
 * Perform a JSON request, unwrap the Velora envelope and return `data`.
 * Throws `ApiError` for network failures, non-2xx statuses and `success:false`.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_CONFIGURED) {
    throw new ApiError({
      message:
        "The API address is not configured. Set EXPO_PUBLIC_API_BASE_URL and restart the app.",
      code: "API_NOT_CONFIGURED",
    });
  }

  const { method = "GET", body, params, signal, headers } = options;

  const config: AxiosRequestConfig = {
    url: path,
    method,
    signal,
    params,
    headers,
  };

  if (body !== undefined) {
    config.data = body;
    config.headers = {
      ...headers,
      "Content-Type": "application/json",
    };
  }

  try {
    const response = await client.request<ApiEnvelope<T>>(config);
    const envelope = response.data;

    if (!envelope.success) {
      throw new ApiError({
        message: envelope.message || "Request failed.",
        status: response.status,
        code: envelope.code,
        fieldErrors: envelope.errors,
      });
    }

    return envelope.data as T;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}

/** Error message suitable for an alert or an inline banner. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
