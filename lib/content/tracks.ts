// Single source of truth for the three residency tracks.
// All copy lives here — components receive slices of this config as props
// and must never embed per-track text.

export type TrackId = 'crypto' | 'art' | 'longevity'
export type TrackState = 'open' | 'coming_soon' | 'closed'

export interface LongevityGroup {
  title: string
  subtitle: string
  description: string
}

export interface TrackConfig {
  id: TrackId
  name: string // "Crypto Residency"
  shortName: string // "Crypto"
  state: TrackState
  accentColor: string // hex, used for buttons/badges on track + apply pages
  image: string // hero/card background
  card: {
    // homepage track card
    description: string
    themes: string[]
  }
  hero: {
    title: string
    tagline: string
    description: string
  }
  whatItIs: {
    description1: string
    description2: string
    highlight: string
  }
  themes: string[]
  questions: string[]
  residentsBring: string[]
  // Longevity-only extra sections (undefined for other tracks)
  longevityExtras?: {
    groups: LongevityGroup[]
    giveBackIntro: string
    giveBack: string[]
  }
  apply: {
    title: string
    subtitle: string
    primaryLinkLabel: string
    extraLinkLabel: string
    extraLinkHint?: string
    extraLinkPlaceholder: string
    showProcessSection: boolean // longevity shows "Process & Duration"
  }
}

export const TRACKS: Record<TrackId, TrackConfig> = {
  crypto: {
    id: 'crypto',
    name: 'Crypto Residency',
    shortName: 'Crypto',
    state: 'open',
    accentColor: '#0A6B5A',
    image: '/residency/images/crypto.png',
    card: {
      description:
        'For crypto builders, researchers, and creators exploring how Ethereum and onchain communities connect with real-life community building.',
      themes: ['Ethereum', 'Zuzalu', 'Public goods', 'Privacy', 'Local-first', 'AI x Crypto'],
    },
    hero: {
      title: '4Seas Crypto Residency Program',
      tagline: 'Where crypto meets community and place.',
      description:
        'We invite builders, researchers, educators, founders, designers, and creators to explore how Ethereum, public goods, open-source systems, and onchain communities connect with real-life community building.',
    },
    whatItIs: {
      description1:
        'A residency for crypto builders, researchers, educators, founders, designers, and creators exploring how crypto moves from infrastructure into everyday life.',
      description2:
        '4Seas is a living space, coworking hub, and community experiment in Chiang Mai, rooted in Ethereum, Zuzalu, and localism. Come build with us.',
      highlight: 'Not a job. Not an accelerator. A residency for shared living and building.',
    },
    themes: [
      'Zuzalu',
      'Network states',
      'Ethereum',
      'Localism',
      'Crypto in real life',
      'Public goods',
      'Privacy',
      'Cypherpunk',
      'Crypto education',
      'Stablecoins and payments',
      'Onchain community infrastructure',
      'AI × Crypto',
      'Longevity × Crypto',
      'Local-first technology',
    ],
    questions: [
      'How can crypto move from infrastructure into everyday life?',
      'What does it mean to build in public and in person?',
      'How can decentralized technologies serve local communities?',
      'What new forms of coordination become possible with crypto?',
      'How can we experiment with public goods in real communities?',
    ],
    residentsBring: [
      'Open source hardware',
      'Workshop',
      'Coding',
      'Reading Group',
      'Smart Contract',
      'Essay',
      'Software Tool',
      'Podcast',
      'Prototype Demo',
      'Article',
      'Course',
      'Video',
      'Local Research',
      'Community Experiment',
    ],
    apply: {
      title: 'Apply for Crypto Residency',
      subtitle: 'Join builders, researchers, and creators exploring the future of decentralized technology.',
      primaryLinkLabel: 'Your Social Media, Personal Website or Publications',
      extraLinkLabel: 'GitHub',
      extraLinkPlaceholder: 'https://github.com/...',
      showProcessSection: false,
    },
  },
  art: {
    id: 'art',
    name: 'Art Residency',
    shortName: 'Art',
    state: 'open',
    accentColor: '#e11d48',
    image: '/residency/images/art.png',
    card: {
      description:
        'For artists, filmmakers, designers, curators and art practitioners who want to create, produce, and experiment inside a living community.',
      themes: ['Community art', 'Moving image', 'Writing', 'Art x Tech', 'On-chain art', 'Social practice'],
    },
    hero: {
      title: '4Seas Art Residency Program',
      tagline: 'Where technology art meets community and place.',
      description:
        'We invite artists, curators, researchers, designers, developers, filmmakers, and interdisciplinary practitioners to explore new relationships between technology, images, protocols, and public life.',
    },
    whatItIs: {
      description1:
        'A residency dedicated to technology art, crypto art, and new media art. This residency is not only concerned with technology as a tool, but with how technology transforms perception, artistic production, identity, social connection, and cultural imagination.',
      description2:
        'Artificial intelligence, blockchain, smart contracts, encrypted identity, on-chain communities, interactive media, generative systems, networked spaces, and decentralized collaboration are redefining how art is created, circulated, collected, and experienced. Through this residency, we hope to bring these ongoing transformations beyond abstract concepts, online platforms, and digital discussions, into physical space, everyday life, and public exchange.',
      highlight:
        'Art is not an isolated individual production, and technology is not merely a tool or topic. Both become ways of reconnecting with place, community, embodied experience, and public life.',
    },
    themes: [
      'Technology Art',
      'AI & Generative Art',
      'Interactive Installation',
      'Moving Image',
      'Sound Art',
      'New Media Art',
      'Community Art',
      'Public Art',
      'Social Practice',
      'Visual Storytelling',
      'Art × Tech',
    ],
    questions: [
      'How are images being reproduced and transformed in the age of AI and algorithms?',
      'How does cryptography reshape trust, identity, ownership, and authorship?',
      'Can smart contracts, blockchains, and decentralized networks become artistic media?',
      'How can privacy, anonymity, verification, consensus, and protocol be translated into artistic language?',
      'How can new media art respond to real communities beyond screens and platforms?',
      'How can technology-based art generate new public conversations within a local context?',
    ],
    residentsBring: [
      'Moving-image Fragments',
      'Interactive Installation Demo',
      'Generative Art Program',
      'Web-based Work',
      'On-chain Prototype',
      'Sound Experiment',
      'AI-generated Image Series',
      'Spatial Installation Model',
      'Research Text',
      'Curatorial Proposal',
      'Workshop Outcome',
      'Community Experiment Documentation',
      'Reading Group',
      'Public Discussion',
      'Open Studio Presentation',
    ],
    apply: {
      title: 'Apply for Art Residency',
      subtitle: 'Join artists, filmmakers, writers, and creators exploring new forms of expression.',
      primaryLinkLabel: 'Portfolio or Personal Website',
      extraLinkLabel: 'Social Media',
      extraLinkPlaceholder: 'Instagram, X, Behance, etc.',
      showProcessSection: false,
    },
  },
  longevity: {
    id: 'longevity',
    name: 'Longevity Residency',
    shortName: 'Longevity',
    state: 'open',
    accentColor: '#10b981',
    image: '/residency/images/longevity.png',
    card: {
      description:
        'For scientists, biohackers, and longevity enthusiasts exploring life extension research in a health-optimized environment.',
      themes: ['Biohacking', 'Longevity', 'Health-tech', 'Wellness', 'Research'],
    },
    hero: {
      title: '4Seas Longevity Residency',
      tagline: 'Live with more meaning. Build a healthier future together.',
      description:
        'A co-creation opportunity for professionals, artists, entrepreneurs, and health enthusiasts to live together, practice together, and explore new possibilities for future healthy lifestyles in Chiang Mai.',
    },
    whatItIs: {
      description1:
        'We believe that longevity is not about living longer, but about living with more meaning. In the world\'s so-called "Blue Zones" — Okinawa, Sardinia, Nicoya — people live longer not simply because of diet and exercise, but because they have a clear sense of purpose, strong social connections, and ongoing contribution to their communities.',
      description2:
        'The core of longevity is not mere extension of years, but living meaningfully. With this philosophy, we have launched the Zuzalu Longevity Residency — a co-creation opportunity for professionals, artists, entrepreneurs, and health enthusiasts to live together, practice together, and explore new possibilities for future healthy lifestyles in Chiang Mai. We care not only about longevity technologies themselves, but also about how health integrates into daily life, how community supports long-term healthy behaviors, and what forms a future healthy society might take.',
      highlight:
        'Not a clinic. Not a retreat. A residency for living, experimenting, and building a healthier future together.',
    },
    themes: [
      'Longevity',
      'Biotech',
      'Sleep',
      'Nutrition',
      'Exercise',
      'Recovery',
      'Biohacking',
      'Health Data',
      'De-Sci',
      'Mental Health',
      'Community Health',
      'Longevity × Crypto',
    ],
    questions: [
      'How can we extend healthspan?',
      'How can we better understand ourselves through practice and data?',
      'How can we build mechanisms within a community that support long-term healthy behaviors?',
      'How can we build better longevity communities?',
    ],
    residentsBring: [
      'Daily Practice Sharing',
      'Health Data Workshop',
      'Biohacking Experiment',
      'Community Health Protocol',
      'Nutrition Research',
      'Fitness Program',
      'Longevity Tech Tool',
      'AI Health Application',
      'Research Paper',
      'Health Article',
      'Community Experiment',
      'Podcast',
      'Reading Group',
      'Open Discussion',
    ],
    longevityExtras: {
      groups: [
        {
          title: 'Health Enthusiasts',
          subtitle:
            'Fitness lovers, nutrition researchers, mindfulness practitioners, and advocates of healthy lifestyles.',
          description:
            'Use your daily practices to elevate the community\'s health atmosphere and become a "living example."',
        },
        {
          title: 'Technologists',
          subtitle: 'Engineers, developers, data scientists, AI researchers, biohackers.',
          description:
            'Use your skills to build tools for the community, optimize health data, and develop longevity-related applications or infrastructure.',
        },
        {
          title: 'Artists',
          subtitle: 'Visual artists, writers, musicians, cross-media creators.',
          description:
            'Explore the theme of "longevity" through your lens, create thought-provoking works, and help translate complex health concepts into accessible experiences.',
        },
      ],
      giveBackIntro:
        'We provide free living, and in exchange you contribute your time and talent to produce something beneficial for the community. This could be:',
      giveBack: [
        'An open-source tool to help residents monitor their health data',
        'An artistic work on the theme of "longevity"',
        'A replicable health program or course',
        'An in-depth article or research report documenting community life',
        'A workshop, sharing session, or co-creation experiment',
        'Anything else you can imagine that brings long-term value to the community',
      ],
    },
    apply: {
      title: 'Apply for Longevity Residency',
      subtitle:
        'Join researchers, biohackers, and wellness innovators exploring the future of health and longevity.',
      primaryLinkLabel: 'Personal Website, Research Profile, or Social Media',
      extraLinkLabel: 'Additional Information',
      extraLinkHint:
        'Share any additional link or detail that may help us understand your work and interests (optional).',
      extraLinkPlaceholder: 'Additional link or brief note...',
      showProcessSection: true,
    },
  },
}

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[]

export function getTrack(id: string): TrackConfig | undefined {
  return (TRACKS as Record<string, TrackConfig>)[id]
}
