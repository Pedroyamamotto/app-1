export const API_BASE_URL = 'https://api.yama.ia.br';
export const API_FALLBACK_BASE_URL = 'https://apibling-z8wn.onrender.com';

export const apiUrl = (path: string) => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
};

const shouldFallbackByStatus = (status: number) => status >= 500 || status === 408 || status === 429;

export const apiFetch = async (path: string, init?: RequestInit) => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const primaryUrl = `${API_BASE_URL}${normalizedPath}`;
	const fallbackUrl = `${API_FALLBACK_BASE_URL}${normalizedPath}`;

	let primaryError: unknown = null;

	try {
		const primaryResponse = await fetch(primaryUrl, init);
		if (!shouldFallbackByStatus(primaryResponse.status)) {
			return primaryResponse;
		}

		if (__DEV__) {
			console.warn(`API principal falhou (${primaryResponse.status}). Tentando fallback ${API_FALLBACK_BASE_URL}.`);
		}
	} catch (error) {
		primaryError = error;
		if (__DEV__) {
			console.warn('API principal indisponivel. Tentando fallback.', error);
		}
	}

	try {
		return await fetch(fallbackUrl, init);
	} catch (fallbackError) {
		if (primaryError) {
			throw primaryError;
		}
		throw fallbackError;
	}
};
