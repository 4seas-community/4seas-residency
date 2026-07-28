// Site-level copy: homepage sections, community links, footer partners.

export const COMMUNITY_LINKS = {
  telegram: 'https://t.me/NomadsBase',
  x: 'https://x.com/4seasDeSoc',
  whatsapp: 'https://chat.whatsapp.com/BeHrYvwwepbIN9m1L859I9',
  website: 'https://www.4seas.xyz',
  ethchiangmai: 'https://www.ethchiangmai.com',
}

export const APPLICATION_PROCESS = [
  { step: '01', title: 'Apply', description: 'Complete the form in about 10 minutes.' },
  {
    step: '02',
    title: 'Review',
    description: 'We review applications within one week and may invite you for a short interview.',
  },
  { step: '03', title: 'Decision', description: 'You’ll receive the final decision by email.' },
] as const

export const SITE = {
  name: '4Seas Residency',
  title: '4Seas Residency Programs | Chiang Mai',
  description:
    'A community-based residency program in Chiang Mai for builders, artists, researchers, founders, creators, and long-term thinkers. Live with the community. Build in public, build in person.',
  hero: {
    location: 'Chiang Mai, Thailand',
    title: '4Seas Residency Programs',
    tagline: 'Live with the community. Build in public, build in person.',
    description:
      '4Seas Residency is a community-based residency program in Chiang Mai for builders, artists, researchers, founders, creators, and long-term thinkers who want to live, work, create, and contribute inside a real community.',
    image: '/residency/images/hero-bg.png',
  },
  sharedExperience: {
    title: 'A Residency Inside a Living Community',
    description:
      'All 4Seas Residency programs are built around shared living, coworking, community contribution, and real-world experimentation. Residents may come from different disciplines, but all tracks share the same foundation.',
    items: [
      { icon: 'home', title: 'Co-living', desc: 'Live with the community in Chiang Mai' },
      { icon: 'users', title: 'Coworking', desc: 'Access to shared workspace and studios' },
      { icon: 'lightbulb', title: 'Events', desc: 'Workshop and discussion spaces' },
      { icon: 'globe', title: 'Network', desc: 'Local and global community connections' },
    ],
  },
  tracksSection: {
    title: 'Residency Tracks',
    description:
      'Each residency track has its own focus, but all share the same spirit: live with the community, contribute in public, and explore what can be built together in Chiang Mai.',
  },
  offers: {
    title: 'What 4Seas Offers',
    description: 'Resources and support that may be available during your residency',
    items: [
      { icon: 'home', text: 'A place to live in Chiang Mai' },
      { icon: 'users', text: 'Access to coworking and shared community spaces' },
      { icon: 'calendar', text: 'Event, workshop, screening, and discussion spaces' },
      { icon: 'mic', text: 'Content Studio access for podcast, video, and documentation' },
      { icon: 'globe', text: 'Cross-disciplinary community of builders, artists, and organizers' },
      { icon: 'book-open', text: 'Local context and community connections' },
      { icon: 'lightbulb', text: 'Opportunities to host, share, test, and document work' },
      { icon: 'check-circle', text: 'Possible small grants depending on program fit' },
    ],
    disclaimer: 'Availability may vary depending on selection and arrangement.',
  },
  howItWorks: {
    title: 'How It Works',
    steps: [
      { step: '01', title: 'Choose a Track', desc: 'Select the residency that fits your work' },
      { step: '02', title: 'Read Details', desc: 'Review program specifics and requirements' },
      { step: '03', title: 'Apply', desc: 'Submit your application online' },
      { step: '04', title: 'Review', desc: 'Our team reviews your application' },
      { step: '05', title: 'Confirm', desc: 'Finalize dates and arrangements' },
      { step: '06', title: 'Co-live', desc: 'Arrive in Chiang Mai and begin' },
    ],
  },
  whoWeWelcome: {
    title: 'Who We Welcome',
    description:
      '4Seas Residency is for people who want to contribute to a living community, not just stay in a place. We welcome those who are curious about how ideas become real through shared life, public programs, and local context.',
    roles: [
      'Builders',
      'Artists',
      'Researchers',
      'Founders',
      'Writers',
      'Filmmakers',
      'Designers',
      'Educators',
      'Cultural Workers',
      'Community Organizers',
      'Long-term Thinkers',
    ],
  },
  exploreMore: {
    title: 'Explore More',
    cards: [
      {
        title: '4Seas',
        description:
          'A cultural hub in Chiang Mai, rooted in Ethereum and part of the Zuzalu Movement. We are actively building the future of community, work, and coordination, leveraging decentralized technologies to do so — where these pioneering concepts seamlessly transition into a lived, daily reality.',
        linkLabel: 'Visit 4Seas Website',
        href: COMMUNITY_LINKS.website,
      },
      {
        title: 'About ETHChiangmai',
        description:
          'ETHChiangmai is a local Ethereum and Web3 community season in Chiang Mai. This year: 11/11/2026 - 1/5/2027. Unconferences, hackathons, summits, coliving, and real-life gatherings.',
        linkLabel: 'Visit ETHChiangmai',
        href: COMMUNITY_LINKS.ethchiangmai,
      },
    ],
    joinCard: {
      title: 'Join the Community',
      description:
        'Connect with us and stay updated on residency opportunities, events, and community activities.',
    },
  },
}

// Copy shown on apply pages for non-open tracks
export const TRACK_STATE_NOTICES = {
  coming_soon: {
    badge: 'Coming Soon',
    title: 'Applications are not open yet',
    description:
      'This track is not accepting applications at the moment. Follow our community channels to hear first when applications open.',
  },
  closed: {
    badge: 'Closed',
    title: 'Applications are closed',
    description:
      'This track is not currently accepting applications. Follow our community channels for future cycles.',
  },
} as const

// Coliving discount promo code included in rejection emails (not a secret —
// it is sent to every rejected applicant). Value to be confirmed by community.
export const COLIVING_PROMO_CODE = '4SEAS-COLIVE'
