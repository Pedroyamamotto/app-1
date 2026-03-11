export const API_BASE_URL = 'https://api.yama.ia.br';

export const apiUrl = (path: string) => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
};
