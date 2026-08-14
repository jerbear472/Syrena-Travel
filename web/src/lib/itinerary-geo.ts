// Geographic helpers shared by the itinerary generate + regenerate routes.

// Great-circle distance in km between two coordinates.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Reorder a day's stops along a sensible visiting path so the route doesn't
// cross town and double back. Greedy nearest-neighbor: keep the first place
// as the anchor (often the intended morning start), then always hop to the
// closest remaining stop. Deterministic — does not depend on the model
// ordering the places correctly.
export function orderByProximity<T extends { lat?: number | null; lng?: number | null }>(
  places: T[]
): T[] {
  const hasCoords = (p: T): p is T & { lat: number; lng: number } =>
    typeof p.lat === 'number' && typeof p.lng === 'number';

  const routable = places.filter(hasCoords);
  const unroutable = places.filter(p => !hasCoords(p));
  if (routable.length < 3) return places;

  const remaining = [...routable];
  const ordered = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineKm(last, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  // Coord-less stops can't be routed — keep them at the end.
  return [...ordered, ...unroutable];
}
