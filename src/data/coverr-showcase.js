/**
 * Curated Coverr Video Showcase Catalog
 * Cinematic, drone aerials, and lifestyle stock footage
 * License: Coverr License (Free for commercial and non-commercial use, no attribution required)
 */

export const COVERR_SHOWCASE = [
  {
    id: 'coverr-cinematic-italy',
    coverr_id: 'coverr-italy-travel',
    title: 'Cinematic Italian Coastlines & Mountain Vistas',
    creator: 'Coverr Filmmaker',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/2_Weeks_In_Italy_-_A_Cinematic_Travel_Film.webm/960px--2_Weeks_In_Italy_-_A_Cinematic_Travel_Film.webm.jpg',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/2_Weeks_In_Italy_-_A_Cinematic_Travel_Film.webm',
    landing_url: 'https://coverr.co/s?q=italy+cinematic',
    source: 'coverr',
    source_name: 'Coverr Video',
    license: 'Coverr License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'WEBM',
    tags: ['italy', 'travel', 'cinematic', 'drone', 'aerial', 'coast', 'landscape'],
    attribution: '“Cinematic Italian Coastlines” via Coverr.co. Coverr License (Free commercial use, no attribution required).',
  },
  {
    id: 'coverr-oregon-coast',
    coverr_id: 'coverr-oregon-fpv',
    title: 'FPV Drone Flying Over Stunning Ocean Cliffs',
    creator: 'Coverr Filmmaker',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Oregon_Coast_Odyssey-_FPV_Drone_Captures_Stunning_Ocean_Views.webm/960px--Oregon_Coast_Odyssey-_FPV_Drone_Captures_Stunning_Ocean_Views.webm.jpg',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Oregon_Coast_Odyssey-_FPV_Drone_Captures_Stunning_Ocean_Views.webm',
    landing_url: 'https://coverr.co/s?q=drone+ocean',
    source: 'coverr',
    source_name: 'Coverr Video',
    license: 'Coverr License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'WEBM',
    tags: ['drone', 'aerial', 'ocean', 'fpv', 'waves', 'cliffs', 'cinematic'],
    attribution: '“FPV Drone Flying Over Stunning Ocean Cliffs” via Coverr.co. Coverr License (Free commercial use, no attribution required).',
  },
  {
    id: 'coverr-big-city-life',
    coverr_id: 'coverr-city-life',
    title: 'Urban Big City Life & Skyscrapers',
    creator: 'Coverr Filmmaker',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Big_City_Life.webm/960px--Big_City_Life.webm.jpg',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Big_City_Life.webm',
    landing_url: 'https://coverr.co/s?q=city+lifestyle',
    source: 'coverr',
    source_name: 'Coverr Video',
    license: 'Coverr License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'WEBM',
    tags: ['city', 'urban', 'skyline', 'traffic', 'lifestyle', 'architecture'],
    attribution: '“Urban Big City Life & Skyscrapers” via Coverr.co. Coverr License (Free commercial use, no attribution required).',
  },
  {
    id: 'coverr-volkswagen-camper',
    coverr_id: 'coverr-vw-camper',
    title: 'Vintage Volkswagen Camper Van Roadtrip',
    creator: 'Coverr Filmmaker',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Volkswagen_T2.webm/960px--Volkswagen_T2.webm.jpg',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Volkswagen_T2.webm',
    landing_url: 'https://coverr.co/s?q=roadtrip+van',
    source: 'coverr',
    source_name: 'Coverr Video',
    license: 'Coverr License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'WEBM',
    tags: ['van', 'roadtrip', 'travel', 'vintage', 'camping', 'volkswagen', 'adventure'],
    attribution: '“Vintage Volkswagen Camper Van Roadtrip” via Coverr.co. Coverr License (Free commercial use, no attribution required).',
  },
  {
    id: 'coverr-wild-lions',
    coverr_id: 'coverr-lions-wild',
    title: 'Wild Lions in African Savanna Safari',
    creator: 'Coverr Filmmaker',
    thumb: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Lions_in_the_wild.webm/960px--Lions_in_the_wild.webm.jpg',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Lions_in_the_wild.webm',
    landing_url: 'https://coverr.co/s?q=wildlife+lions',
    source: 'coverr',
    source_name: 'Coverr Video',
    license: 'Coverr License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'WEBM',
    tags: ['lions', 'safari', 'wildlife', 'africa', 'animals', 'nature', 'savanna'],
    attribution: '“Wild Lions in African Savanna Safari” via Coverr.co. Coverr License (Free commercial use, no attribution required).',
  },
]

export function searchCoverrShowcase(query = '') {
  const q = query.trim().toLowerCase()
  if (!q) return COVERR_SHOWCASE
  return COVERR_SHOWCASE.filter((item) => {
    return (
      item.title.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })
}
