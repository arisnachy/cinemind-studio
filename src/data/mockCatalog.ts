import { TasteProfile, Title, Universe, Character, Episode } from '../types/content';

const character = (id: string, universeId: string, name: string, role: string, motivation: string): Character => ({
  id, universeId, name, role,
  visualDescriptor: 'Original CINEMIND character design; cinematic silhouette, no real-person likeness.',
  motivation,
  relationships: [],
  knowledgeState: 'Knows only events established in the current canon.',
  avatarUrl: '',
  status: 'Alive'
});

const episode = (titleId: string, n: number, title: string, synopsis: string, watchedPercentage = 0): Episode => ({
  id: `${titleId}-ep-${n}`,
  titleId,
  seasonNumber: 1,
  episodeNumber: n,
  title,
  synopsis,
  durationMinutes: 42,
  thumbnailUrl: '',
  status: 'Ready',
  watchedPercentage
});

export const MOCK_PROFILES: TasteProfile[] = [
  {
    id: 'viewer-elena', name: 'Elena Rostova', avatar: '',
    bio: 'Atmospheric science-fiction, nonlinear mysteries and psychologically dense stories.',
    topGenres: ['Hard Sci-Fi', 'Psychological Thriller', 'Cyberpunk'],
    narrativePacing: 'Deep Psychological & Atmospheric',
    currentObsession: 'Synthetic memory and impossible timelines',
    universesFollowed: ['univ-neurosync', 'univ-aethelgard'],
    stats: { titlesGenerated: 8, episodesWatched: 27, canonInterventions: 4 }
  },
  {
    id: 'viewer-marcus', name: 'Marcus Vance', avatar: '',
    bio: 'Fast speculative action and survival stories with hard world rules.',
    topGenres: ['Space Opera', 'Post-Apocalyptic', 'Action'],
    narrativePacing: 'Fast & High-Stakes',
    currentObsession: 'Orbital disasters and rogue machines',
    universesFollowed: ['univ-aethelgard'],
    stats: { titlesGenerated: 5, episodesWatched: 19, canonInterventions: 2 }
  },
  {
    id: 'viewer-judge', name: 'Judge & Architect Mode', avatar: '',
    bio: 'Technical profile for inspecting narrative memory, generation provenance and canon health.',
    topGenres: ['All Original Universes', 'Continuity Validation'],
    narrativePacing: 'Complex Nonlinear',
    currentObsession: 'ClickHouse memory evidence',
    universesFollowed: ['univ-neurosync', 'univ-aethelgard', 'univ-cobalt'],
    stats: { titlesGenerated: 24, episodesWatched: 80, canonInterventions: 12 }
  }
];

const kaelen = character('char-kaelen', 'univ-neurosync', 'Kaelen Cross', 'Synaptic Forensic Detective', 'Recover the truth behind her altered childhood memories.');
const cipher = character('char-cipher', 'univ-neurosync', 'Cipher Ren', 'Underground Memory Stitcher', 'Free sentient memory constructs from corporate control.');
const lyra = character('char-lyra', 'univ-aethelgard', 'Lyra Vale', 'Orbital Stabilization Engineer', 'Prevent the collapse of the lower habitation ring.');
const mira = character('char-mira', 'univ-cobalt', 'Mira Soren', 'Quantum Crime Analyst', 'Solve a murder that appears to precede its own cause.');

export const MOCK_UNIVERSES: Universe[] = [
  {
    id: 'univ-neurosync', name: 'NeuroSync: Protocol 9', tagline: 'When memory is currency, who owns your past?',
    premise: 'In New Kyoto, memories can be extracted and traded. A forensic detective discovers evidence that her own identity was assembled from incompatible lives.',
    heroBackdropUrl: '', posterUrl: '',
    themeColors: { primary: '#7c3aed', secondary: '#db2777', accent: '#22d3ee' },
    canonHealthPercent: 99.8, canonVersion: 'v1.4.0',
    worldRules: ['Memory edits leave a measurable temporal checksum.', 'Synthetic identities cannot legally own memory assets.', 'Level-4 cortical ports are corporate-controlled.'],
    activeArc: 'Kaelen traces the origin of a forbidden identity backup.',
    characters: [kaelen, cipher],
    timeline: [
      { id: 'ns-t1', universeId: 'univ-neurosync', yearOrEra: '2094', title: 'The Zero-Hour Cartridge', description: 'A wiped cartridge exposes a contradiction in Kaelen’s cortical record.', affectedCharacters: ['Kaelen Cross'], canonical: true }
    ],
    canonFacts: [
      { id: 'ns-c1', universeId: 'univ-neurosync', fact: 'Kaelen’s cortical birth timestamp conflicts with her legal identity.', category: 'Character Truth', confidenceScore: 0.99, firstEstablishedIn: 'Protocol 9 · Episode 1', canonVersion: 'v1.4.0' }
    ],
    locations: [{ name: 'Lumina Undercity', description: 'Rain-soaked district of unlicensed memory markets.', type: 'Cyber District' }],
    lastEvolvedDate: '2 hours ago'
  },
  {
    id: 'univ-aethelgard', name: 'Aethelgard: Broken Orbit', tagline: 'Gravity is a privilege.',
    premise: 'A vast orbital ring above a storm planet begins to fail. An engineer finds evidence that the collapse was engineered to abandon the lower sectors.',
    heroBackdropUrl: '', posterUrl: '',
    themeColors: { primary: '#2563eb', secondary: '#0891b2', accent: '#f59e0b' },
    canonHealthPercent: 99.4, canonVersion: 'v1.2.1',
    worldRules: ['The lower ring cannot survive atmospheric shear without magnetic anchors.', 'Oxygen synthesis is controlled from the Apex Ring.'],
    activeArc: 'Lyra follows the sabotage trail into the governing council.',
    characters: [lyra],
    timeline: [{ id: 'ae-t1', universeId: 'univ-aethelgard', yearOrEra: 'Ring Year 189', title: 'Sector 14 Shear', description: 'A twelve-second gravity collapse exposes hidden damage.', affectedCharacters: ['Lyra Vale'], canonical: true }],
    canonFacts: [{ id: 'ae-c1', universeId: 'univ-aethelgard', fact: 'Sector 14 failed from induced resonance, not metal fatigue.', category: 'Historical Event', confidenceScore: 0.98, firstEstablishedIn: 'Fractured Horizon · Episode 2', canonVersion: 'v1.2.1' }],
    locations: [{ name: 'The Under-Spoke', description: 'Industrial maintenance spine beneath the inhabited ring.', type: 'Orbital Infrastructure' }],
    lastEvolvedDate: 'Yesterday'
  },
  {
    id: 'univ-cobalt', name: 'The Cobalt Paradox', tagline: 'Solve the crime before time notices.',
    premise: 'A quantum crime unit receives evidence from murders that have not happened yet, until its lead analyst discovers she is the next victim.',
    heroBackdropUrl: '', posterUrl: '',
    themeColors: { primary: '#0f766e', secondary: '#4338ca', accent: '#67e8f9' },
    canonHealthPercent: 98.9, canonVersion: 'v1.0.3',
    worldRules: ['Future evidence can be observed but not safely copied.', 'Every intervention increases temporal entropy.'],
    activeArc: 'Mira hunts the origin of evidence signed by her future self.',
    characters: [mira],
    timeline: [{ id: 'cb-t1', universeId: 'univ-cobalt', yearOrEra: 'T-72h', title: 'Evidence Before Cause', description: 'Mira receives a murder sample bearing her own future biometrics.', affectedCharacters: ['Mira Soren'], canonical: true }],
    canonFacts: [{ id: 'cb-c1', universeId: 'univ-cobalt', fact: 'Mira’s future biometric signature is present on the first evidence packet.', category: 'Character Truth', confidenceScore: 0.97, firstEstablishedIn: 'Zero Point · Episode 1', canonVersion: 'v1.0.3' }],
    locations: [{ name: 'Cobalt Lab', description: 'Shielded forensic chamber isolated from causal network traffic.', type: 'Quantum Laboratory' }],
    lastEvolvedDate: '3 days ago'
  }
];

export const MOCK_TITLES: Title[] = [
  {
    id: 'title-neurosync-flagship', universeId: 'univ-neurosync', universeName: 'NeuroSync: Protocol 9',
    title: 'NeuroSync: Protocol 9', tagline: 'Your memories are admissible evidence.',
    synopsis: 'A synaptic detective investigates a murdered whistleblower and discovers the impossible suspect is encoded inside her own memory architecture.',
    type: 'series', releaseYear: 2026, rating: 'TV-14', duration: '1 Season · 5 Episodes', totalSeasons: 1,
    matchScore: 98, genres: ['Cyberpunk', 'Neo-Noir', 'Psychological Thriller'], tones: ['Atmospheric', 'Mysterious'],
    badges: ['CINEMIND Original', 'Created For You', 'Canon Memory'], backdropUrl: '', posterUrl: '', logoText: 'NEUROSYNC', featured: true,
    continueWatching: { lastWatchedEpisodeId: 'title-neurosync-flagship-ep-2', seasonNumber: 1, episodeNumber: 2, progressPercentage: 61, remainingMinutes: 17 },
    canonStatus: 'Canonical', cast: [kaelen, cipher],
    whyCreated: [{ factor: 'Memory mystery affinity', affinityScore: 'Very High', description: 'Matches the active profile’s declared interest in nonlinear identity stories.', sourceSignal: 'Profile preference: psychological sci-fi' }],
    episodes: [
      episode('title-neurosync-flagship', 1, 'Checksum', 'A dead courier’s memory contains a timestamp from Kaelen’s childhood.', 100),
      episode('title-neurosync-flagship', 2, 'Ghost Identity', 'Cipher proves the impossible timestamp is cryptographically authentic.', 61),
      episode('title-neurosync-flagship', 3, 'The Fourth Port', 'An illegal cortical port appears in archived medical imaging.')
    ]
  },
  {
    id: 'title-aethelgard-fractured', universeId: 'univ-aethelgard', universeName: 'Aethelgard: Broken Orbit',
    title: 'Fractured Horizon', tagline: 'The ring is failing on purpose.',
    synopsis: 'Lyra Vale races through a destabilizing orbital megastructure to expose the sabotage before an entire worker district is cut loose.',
    type: 'series', releaseYear: 2026, rating: 'TV-14', duration: '1 Season · 4 Episodes', totalSeasons: 1,
    matchScore: 96, genres: ['Hard Sci-Fi', 'Space Opera'], tones: ['Tense', 'Epic'], badges: ['Created For You', '4K Concept'],
    backdropUrl: '', posterUrl: '', logoText: 'FRACTURED HORIZON', canonStatus: 'Canonical', cast: [lyra],
    whyCreated: [{ factor: 'Orbital engineering', affinityScore: 'High', description: 'Built for viewers who prefer hard-world constraints and political stakes.', sourceSignal: 'Profile genre: hard sci-fi' }],
    episodes: [episode('title-aethelgard-fractured', 1, 'Harmonic Drift', 'Lyra detects a resonance that should not exist.'), episode('title-aethelgard-fractured', 2, 'Sector 14', 'Gravity fails for twelve seconds and exposes deliberate damage.')]
  },
  {
    id: 'title-cobalt-zero', universeId: 'univ-cobalt', universeName: 'The Cobalt Paradox',
    title: 'Cobalt Paradox: Zero Point', tagline: 'The victim is you, three days from now.',
    synopsis: 'A quantum crime analyst receives evidence from her own future murder and has seventy-two hours to discover who sent it without causing the crime herself.',
    type: 'series', releaseYear: 2026, rating: 'TV-MA', duration: '1 Season · 6 Episodes', totalSeasons: 1,
    matchScore: 97, genres: ['Quantum Mystery', 'Neo-Noir'], tones: ['Nonlinear', 'High-Stakes'], badges: ['Autonomous Pick', 'Canon Memory'],
    backdropUrl: '', posterUrl: '', logoText: 'COBALT PARADOX', canonStatus: 'Canonical', cast: [mira],
    whyCreated: [{ factor: 'Temporal puzzle', affinityScore: 'Very High', description: 'Optimized for nonlinear mystery preferences.', sourceSignal: 'Profile pacing: complex nonlinear' }],
    episodes: [episode('title-cobalt-zero', 1, 'T-72', 'Evidence from an impossible future arrives in a sealed lab.')]
  },
  {
    id: 'title-ringfall', universeId: 'univ-aethelgard', universeName: 'Aethelgard: Broken Orbit',
    title: 'Ringfall', tagline: 'One capsule. No tether. Ninety minutes of atmosphere.',
    synopsis: 'A maintenance crew becomes detached from Aethelgard and must improvise a return path through a lethal storm layer.',
    type: 'movie', releaseYear: 2026, rating: 'PG-13', duration: '1h 52m', matchScore: 92,
    genres: ['Sci-Fi Survival', 'Action'], tones: ['Tense', 'Immersive'], badges: ['Feature Film'], backdropUrl: '', posterUrl: '', logoText: 'RINGFALL',
    canonStatus: 'Canonical', cast: [lyra], whyCreated: [{ factor: 'Weekend feature', affinityScore: 'High', description: 'A standalone survival story inside a followed universe.', sourceSignal: 'Format preference: feature' }], episodes: []
  },
  {
    id: 'title-ghost-synapse', universeId: 'univ-neurosync', universeName: 'NeuroSync: Protocol 9',
    title: 'The Ghost Synapse', tagline: 'Before memories were money, one was stolen.',
    synopsis: 'A noir prequel about the first illegal synthetic memory sold in New Kyoto.',
    type: 'movie', releaseYear: 2026, rating: 'TV-MA', duration: '2h 02m', matchScore: 95,
    genres: ['Cyberpunk', 'Neo-Noir'], tones: ['Dark', 'Emotional'], badges: ['Spin-off Film'], backdropUrl: '', posterUrl: '', logoText: 'THE GHOST SYNAPSE',
    canonStatus: 'Canonical', cast: [cipher], whyCreated: [{ factor: 'Character lore', affinityScore: 'Rising', description: 'Expands the most-engaged supporting character.', sourceSignal: 'Character interest: Cipher' }], episodes: []
  },
  {
    id: 'title-neon-rain', universeId: 'univ-neurosync', universeName: 'NeuroSync: Protocol 9',
    title: 'Neon Rain Memory', tagline: 'A quiet twenty-four minutes inside someone else’s night.',
    synopsis: 'An ambient short assembled as a sensory walk through New Kyoto after midnight.',
    type: 'short', releaseYear: 2026, rating: 'PG-13', duration: '24m', matchScore: 90,
    genres: ['Cyberpunk', 'Visual Poetry'], tones: ['Hypnotic', 'Atmospheric'], badges: ['Tonight 20–35m'], backdropUrl: '', posterUrl: '', logoText: 'NEON RAIN',
    canonStatus: 'Canonical', cast: [], whyCreated: [{ factor: 'Short evening slot', affinityScore: 'Core Habit', description: 'Fits a short late-evening viewing window.', sourceSignal: 'Declared session preference' }], episodes: []
  }
];
