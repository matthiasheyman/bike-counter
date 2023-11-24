export function yyyymmdd(dateIn: Date) {
	const yyyy = dateIn.getFullYear();
	const mm = dateIn.getMonth() + 1;
	const dd = dateIn.getDate();
	return String((10_000 * yyyy) + (100 * mm) + dd);
}
