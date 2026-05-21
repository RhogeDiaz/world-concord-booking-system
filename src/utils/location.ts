export function slugifyStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

export async function resolvePinnedLocation(lat: number, lng: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
  )

  if (!response.ok) {
    throw new Error('Failed to resolve location')
  }

  const data = (await response.json()) as { display_name?: string }
  return data.display_name ?? formatPinnedLocation(lat, lng)
}

export async function searchLocationByAddress(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
  )

  if (!response.ok) {
    throw new Error('Failed to search location')
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>

  if (!results.length) {
    throw new Error('No location found')
  }

  const result = results[0]
  const lat = Number(result.lat)
  const lng = Number(result.lon)

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('Invalid location result')
  }

  return {
    lat,
    lng,
    label: result.display_name ?? query,
  }
}

export function formatPinnedLocation(lat: number, lng: number) {
  return `Pinned location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
