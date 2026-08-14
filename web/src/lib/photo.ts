// Stored photo_url values are absolute URLs to the production photo proxy
// (mobile renders them directly and needs a full host). The web app should
// always serve photos through its OWN origin instead, so local dev and
// preview deploys use their own /api/photo (with its heal + cache logic)
// rather than whatever host was baked into the data.
export function photoSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const i = url.indexOf('/api/photo?');
  return i === -1 ? url : url.slice(i);
}
