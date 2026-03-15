const AGENDA_API_URL = process.env.AGENDA_API_URL ?? 'http://localhost:8080';
const token = process.env.TOKEN ?? '';

if (!token) {
  console.error('Required: TOKEN=<your-bearer-token>');
  process.exit(1);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AGENDA_API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface Agenda { id: string }
interface Item { id: string; title: string }
interface ItemPayload {
  title: string;
  date: string;
  start_time: string;
  end_time?: string;
  location?: string;
  description?: string;
}

console.log('Creating agenda…');
const agenda = await post<Agenda>('/agendas', {
  title: 'KL Trip — April 2026',
  description: '3-day itinerary: 3–5 April 2026',
  visibility: 'private',
});
const id = agenda.id;
console.log(`Agenda created: ${id}\n`);

const items: ItemPayload[] = [
  // ── FRIDAY 3 APRIL ─────────────────────────────────────────────────────
  {
    title: 'Morning Brunch',
    date: '2026-04-03', start_time: '10:00', end_time: '12:00',
    location: 'Yellow Brick Road, Bukit Damansara',
    description: 'Iconic KL brunch spot. Expect queues, go early. Alt: Pow Pow, Damansara.',
  },
  {
    title: 'Team Building',
    date: '2026-04-03', start_time: '12:30', end_time: '15:00',
    location: 'District 21 (IOI City Mall) / Escape Room / Party Box',
    description: 'Choose one, book in advance. District 21 ~RM80-120/pax, Escape Room ~RM40-60/pax.',
  },
  {
    title: 'AirBnB Check-in',
    date: '2026-04-03', start_time: '15:00', end_time: '16:00',
    location: 'AirBnB',
    description: 'Settle in, drop bags, freshen up.',
  },
  {
    title: 'Pool / Gym Chill',
    date: '2026-04-03', start_time: '16:30', end_time: '18:30',
    location: 'AirBnB',
    description: 'Decompress. Swim or gym, whatever the vibe.',
  },
  {
    title: 'Cook Together',
    date: '2026-04-03', start_time: '19:00', end_time: '20:30',
    location: 'AirBnB',
    description: 'Group cooking session. Assign roles — cook, chop, plate, wash.',
  },
  {
    title: 'Dinner + Games Night',
    date: '2026-04-03', start_time: '20:30', end_time: '22:00',
    location: 'AirBnB',
    description: 'Eat + yap + Gartic Phone / Jackbox / Werewolf / Drunk Jenga.',
  },
  {
    title: 'Drinks & House Party',
    date: '2026-04-03', start_time: '22:00',
    location: 'AirBnB',
    description: 'Set the tone for the whole weekend.',
  },

  // ── SATURDAY 4 APRIL ───────────────────────────────────────────────────
  {
    title: 'Breakfast — Mamak',
    date: '2026-04-04', start_time: '09:00', end_time: '09:45',
    location: 'Nearest mamak',
    description: 'Roti canai + teh tarik. Light and fast.',
  },
  {
    title: 'Thean Hou Temple',
    date: '2026-04-04', start_time: '10:00', end_time: '11:15',
    location: 'Thean Hou Temple, Robson Hill',
    description: '6-tiered Chinese temple. Free entry. Panoramic KL view from the hill.',
  },
  {
    title: 'Merdeka Square + Sultan Abdul Samad',
    date: '2026-04-04', start_time: '11:30', end_time: '12:00',
    location: 'Dataran Merdeka, KL',
    description: 'Just reopened Feb 2026 — go inside for the first time. Malaysia\'s independence square.',
  },
  {
    title: 'River of Life Walkway',
    date: '2026-04-04', start_time: '12:00', end_time: '12:15',
    location: 'Masjid Jamek LRT area',
    description: 'Blue illuminated river promenade. 10-min photogenic stroll.',
  },
  {
    title: 'Jamek Mosque',
    date: '2026-04-04', start_time: '12:15', end_time: '12:45',
    location: 'Masjid Jamek, KL',
    description: 'One of KL\'s oldest mosques. Sits at river confluence. Great bridge photo.',
  },
  {
    title: 'Lunch — LOKL Coffee',
    date: '2026-04-04', start_time: '12:45', end_time: '14:00',
    location: 'LOKL Coffee, Jln Tun H.S. Lee',
    description: 'Heritage shophouse café near Chinatown. Strong coffee, good food.',
  },
  {
    title: 'Sri Mahamariamman Temple',
    date: '2026-04-04', start_time: '14:00', end_time: '14:30',
    location: 'Petaling Street, KL',
    description: 'Oldest Hindu temple in KL. Vibrant, colourful, free entry.',
  },
  {
    title: 'Kwai Chai Hong Alley',
    date: '2026-04-04', start_time: '14:30', end_time: '15:00',
    location: 'Kwai Chai Hong, Petaling Street',
    description: 'Hidden heritage street art alley. Most tourists miss it. PS150 bar is right next door.',
  },
  {
    title: 'Petaling Street + Central Market',
    date: '2026-04-04', start_time: '15:00', end_time: '16:30',
    location: 'Petaling Street → Pasar Seni',
    description: 'Classic Chinatown wander then A/C break at Central Market for souvenirs.',
  },
  {
    title: 'Rest + Get Ready',
    date: '2026-04-04', start_time: '16:30', end_time: '18:30',
    location: 'AirBnB',
    description: 'Shower, outfit change, pregame.',
  },
  {
    title: 'Pregame',
    date: '2026-04-04', start_time: '18:30', end_time: '19:30',
    location: 'AirBnB',
    description: 'Light drinks and snacks. Don\'t go too hard yet.',
  },
  {
    title: 'Bukit Bintang Explore',
    date: '2026-04-04', start_time: '19:30', end_time: '21:00',
    location: 'Bukit Bintang (via Monorail)',
    description: 'Jalan Alor street food, Pavilion KL, Lot 10 area. Walk, eat, take photos.',
  },
  {
    title: 'Dinner — Hutong, Lot 10',
    date: '2026-04-04', start_time: '21:00', end_time: '21:45',
    location: 'Hutong, Lot 10, Bukit Bintang',
    description: 'Legendary hawker food court. Wonton noodles + char siu.',
  },
  {
    title: 'Maestro Club',
    date: '2026-04-04', start_time: '22:00', end_time: '02:00',
    location: 'Maestro Club, KL',
    description: 'Book table in advance. Peaks 11pm–1am. Wraps ~2am.',
  },

  // ── SUNDAY 5 APRIL ─────────────────────────────────────────────────────
  {
    title: 'Optional: Sunrise',
    date: '2026-04-05', start_time: '06:45', end_time: '07:30',
    location: 'KLCC Park',
    description: 'Only if group is willing. Back from Maestro at ~2am = ~5hrs sleep. Sunrise ~7:05am.',
  },
  {
    title: 'Brunch',
    date: '2026-04-05', start_time: '09:00', end_time: '10:30',
    location: 'LOKL Coffee or Dim Sum, Jln Ipoh',
    description: 'Recovery meal. Slow pace. Coffee mandatory.',
  },
  {
    title: 'Depart for Sekinchan',
    date: '2026-04-05', start_time: '10:30', end_time: '12:00',
    location: 'LATAR Expressway',
    description: '~1.5hr drive north. Need own car — no Grab in Sekinchan.',
  },
  {
    title: 'Paddy Fields + Bike',
    date: '2026-04-05', start_time: '12:00', end_time: '12:30',
    location: 'Sekinchan Paddy Fields',
    description: 'April = peak green season. Rent bikes from AMG rental. Free entry.',
  },
  {
    title: 'N16 Bus Café',
    date: '2026-04-05', start_time: '12:30', end_time: '13:00',
    location: 'N16 Bus Café, Sekinchan',
    description: 'Iconic bus-on-container café in the middle of the fields. Air-conditioned.',
  },
  {
    title: 'Paddy Gallery',
    date: '2026-04-05', start_time: '13:00', end_time: '13:30',
    location: 'PLS Marketing, Sekinchan',
    description: 'RM5/pax. Rice factory tour + free Pearl Rice packet.',
  },
  {
    title: 'Ah Ma House + Mango King',
    date: '2026-04-05', start_time: '13:30', end_time: '14:00',
    location: 'Sekinchan town',
    description: 'Kuih kapit + passion fruit mango smoothie. Order early — sells out.',
  },
  {
    title: 'Sekinchan Seafood',
    date: '2026-04-05', start_time: '14:00', end_time: '15:15',
    location: 'Bagan Area, Sekinchan',
    description: 'Butter prawns, steamed fish, salted egg crab. Fresh and cheap.',
  },
  {
    title: 'Drive Back to KL',
    date: '2026-04-05', start_time: '15:30', end_time: '17:00',
    location: 'LATAR Expressway',
    description: 'Drop people at LRT/KTM or directly home.',
  },
  {
    title: 'Farewell',
    date: '2026-04-05', start_time: '17:00',
    location: 'KL',
    description: 'Say goodbyes, pack up, check out. Weekend done.',
  },
];

for (const item of items) {
  const created = await post<Item>(`/agendas/${id}/items`, item);
  console.log(`  ✓ [${item.date}] ${created.title}`);
}

console.log(`\nDone — ${items.length} items added to agenda "${agenda.id}".`);
