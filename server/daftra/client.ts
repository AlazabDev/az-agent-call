import { getDaftraConfig } from "./config.js";
import { DaftraError } from "./errors.js";

export class DaftraClient {
	/**
	 * Helper to execute HTTP requests against Daftra API
	 */
	public async request<T = any>(
		path: string,
		options: {
			method?: "GET" | "POST" | "PUT" | "DELETE";
			query?: Record<string, string | number | boolean | undefined>;
			body?: unknown;
			timeoutMs?: number;
		} = {},
	): Promise<T> {
		const config = getDaftraConfig();

		if (!config.isConfigured) {
			throw new DaftraError(
				"DAFTRA_NOT_CONFIGURED",
				"Daftra ERP integration is not configured. Set DAFTRA_API_KEY or DAFTRA_ACCESS_TOKEN.",
			);
		}

		const method = options.method || "GET";
		const timeout = options.timeoutMs || config.timeoutMs;

		let normalizedPath = path.startsWith("/") ? path : `/${path}`;
		normalizedPath = normalizedPath.replace("{format}", ".json");

		// Daftra exposes two HTTP surfaces with different authentication rules:
		// - /api2/* uses the legacy API key surface.
		// - /v2/api/entity/* uses the native entity surface and requires Bearer auth.
		// DAFTRA_BASE_URL is commonly configured with a trailing /api2, therefore v2
		// requests must be rebuilt from the origin instead of becoming /api2/v2/....
		const configuredBase = new URL(config.baseUrl.replace(/\/+$/, ""));
		const isV2EntityRequest = normalizedPath.startsWith("/v2/");
		let url: URL;

		if (isV2EntityRequest) {
			url = new URL(`${configuredBase.origin}${normalizedPath}`);
		} else {
			const baseUrl = configuredBase.toString().replace(/\/+$/, "");
			if (baseUrl.endsWith("/api2") && normalizedPath.startsWith("/api2/")) {
				normalizedPath = normalizedPath.slice(5);
			}
			url = new URL(`${baseUrl}${normalizedPath}`);
		}
		if (options.query) {
			for (const [key, val] of Object.entries(options.query)) {
				if (val !== undefined && val !== null) {
					url.searchParams.append(key, String(val));
				}
			}
		}

		const headers: Record<string, string> = {
			Accept: "application/json",
			"Content-Type": "application/json",
		};

		if (isV2EntityRequest) {
			if (!config.accessToken) {
				throw new DaftraError(
					"DAFTRA_AUTH_FAILED",
					"Daftra v2 native-entity request requires DAFTRA_ACCESS_TOKEN (Bearer auth).",
				);
			}
			headers.Authorization = `Bearer ${config.accessToken}`;
		} else if (config.authMode === "bearer" && config.accessToken) {
			headers.Authorization = `Bearer ${config.accessToken}`;
		} else if (config.apiKey) {
			headers.APIKEY = config.apiKey;
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url.toString(), {
				method,
				headers,
				body: options.body ? JSON.stringify(options.body) : undefined,
				signal: controller.signal,
			});

			clearTimeout(timer);

			const contentType = response.headers.get("content-type") || "";
			const isJson = contentType.includes("application/json");
			const textBody = await response.text();

			let data: any = textBody;
			if (isJson && textBody.trim().length > 0) {
				try {
					data = JSON.parse(textBody);
				} catch {
					// Keep textBody if JSON parse fails
				}
			}

			if (!response.ok) {
				if (response.status === 401 || response.status === 403) {
					throw new DaftraError(
						"DAFTRA_AUTH_FAILED",
						"Daftra API authentication failed",
						response.status,
						data,
					);
				}
				if (response.status === 404) {
					throw new DaftraError(
						"DAFTRA_NOT_FOUND",
						`Resource not found on Daftra ERP: ${path}`,
						response.status,
						data,
					);
				}
				throw new DaftraError(
					"DAFTRA_UNAVAILABLE",
					`Daftra API returned HTTP ${response.status}: ${typeof data === "object" ? JSON.stringify(data) : textBody}`,
					response.status,
					data,
				);
			}

			return data as T;
		} catch (err: any) {
			clearTimeout(timer);

			if (err instanceof DaftraError) {
				throw err;
			}

			if (err.name === "AbortError") {
				throw new DaftraError(
					"DAFTRA_TIMEOUT",
					`Daftra API request timed out after ${timeout}ms: ${method} ${path}`,
				);
			}

			throw new DaftraError(
				"DAFTRA_UNAVAILABLE",
				`Daftra network request failed: ${err.message || String(err)}`,
			);
		}
	}

	public async get<T = any>(
		path: string,
		query?: Record<string, any>,
	): Promise<T> {
		return this.request<T>(path, { method: "GET", query });
	}

	public async post<T = any>(path: string, body?: unknown): Promise<T> {
		return this.request<T>(path, { method: "POST", body });
	}

	public async put<T = any>(path: string, body?: unknown): Promise<T> {
		return this.request<T>(path, { method: "PUT", body });
	}

	public async delete<T = any>(path: string): Promise<T> {
		return this.request<T>(path, { method: "DELETE" });
	}
}

export const daftraClient = new DaftraClient();
