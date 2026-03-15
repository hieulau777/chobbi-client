export function resolveBackendFileUrl(
  url: string | null | undefined,
): string {
  if (!url || !url.trim()) return "/file.svg";
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/backend/static/")) return url;
  const path = url.startsWith("/") ? url.slice(1) : url;
  return `/api/backend/static/${path}`;
}

