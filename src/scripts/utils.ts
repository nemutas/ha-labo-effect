export const resolvePath = (path: string) => {
	const p = path.startsWith('/') ? path.substring(1) : path
	return import.meta.env.BASE_URL + p
}
