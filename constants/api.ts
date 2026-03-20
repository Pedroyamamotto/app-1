export const API_BASE_URL = 'https://apibling-z8wn.onrender.com';
export const API_FALLBACK_BASE_URL = 'https://apibling-z8wn.onrender.com';

type ApiFetchInit = RequestInit & {
	allowFallback?: boolean;
};

export const apiUrl = (path: string) => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
};

const shouldFallbackByStatus = (status: number) => status >= 500 || status === 408 || status === 429;

export const apiFetch = async (path: string, init?: ApiFetchInit) => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const primaryUrl = `${API_BASE_URL}${normalizedPath}`;
	const fallbackUrl = `${API_FALLBACK_BASE_URL}${normalizedPath}`;
	const method = (init?.method || 'GET').toUpperCase();
	const allowFallback = init?.allowFallback ?? (method === 'GET' || method === 'HEAD');

	let primaryError: unknown = null;

	try {
		const requestInit: RequestInit | undefined = init
			? ({ ...init, allowFallback: undefined } as unknown as RequestInit)
			: undefined;
		const primaryResponse = await fetch(primaryUrl, requestInit);
		if (!allowFallback || !shouldFallbackByStatus(primaryResponse.status)) {
			return primaryResponse;
		}
	} catch (error) {
		if (!allowFallback) {
			throw error;
		}

		primaryError = error;
	}

	try {
		const requestInit: RequestInit | undefined = init
			? ({ ...init, allowFallback: undefined } as unknown as RequestInit)
			: undefined;
		return await fetch(fallbackUrl, requestInit);
	} catch (fallbackError) {
		if (primaryError) {
			throw primaryError;
		}
		throw fallbackError;
	}
};
