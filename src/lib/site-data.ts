/** Single source of truth for the toolkit and the curated game lists.
 *  Used by /tools, the homepage, the footer and the sitemap so a new tool is
 *  added in exactly one place and can never be orphaned from the crawl graph. */

export interface Tool {
  name: string;
  href: string;
  icon: string;
  blurb: string;
  /** Short label used in the "related tools" rails. */
  short: string;
}

export const TOOLS: Tool[] = [
  { name: 'Can I Run It?',       href: '/can-it-run',       icon: 'bi-controller',       short: 'Can I Run It',      blurb: 'Match any game against your exact GPU, CPU and RAM and get a verdict in seconds.' },
  { name: 'FPS Calculator',      href: '/fps-estimator',    icon: 'bi-speedometer2',     short: 'FPS Calculator',    blurb: 'Estimate average frame rates at 1080p, 1440p and 4K on low through ultra presets.' },
  { name: 'Bottleneck Calculator', href: '/bottleneck',     icon: 'bi-diagram-3',        short: 'Bottleneck Calc',   blurb: 'Find out whether your CPU or your GPU is holding the other one back, and by how much.' },
  { name: 'Build Suggester',     href: '/build-suggest',    icon: 'bi-pc-display',       short: 'Build Suggester',   blurb: 'Get a complete parts list tuned to your budget, target resolution and frame rate.' },
  { name: 'Compare GPUs',        href: '/compare-gpu',      icon: 'bi-bar-chart-line',   short: 'Compare GPUs',      blurb: 'Put two graphics cards side by side across performance, VRAM, power draw and price.' },
  { name: 'Compare CPUs',        href: '/compare-cpu',      icon: 'bi-cpu',              short: 'Compare CPUs',      blurb: 'Head-to-head processor comparison for gaming: cores, clocks, tier and real value.' },
  { name: 'GPU Tier List',       href: '/gpu-tier-list',    icon: 'bi-trophy',           short: 'GPU Tier List',     blurb: 'Every modern graphics card ranked S through F by real gaming performance.' },
  { name: 'CPU Tier List',       href: '/cpu-tier-list',    icon: 'bi-list-ol',          short: 'CPU Tier List',     blurb: 'Every modern gaming processor ranked S through F, updated for 2026.' },
  { name: 'PSU Calculator',      href: '/psu-calculator',   icon: 'bi-plug',             short: 'PSU Calculator',    blurb: 'Size your power supply correctly with proper transient and headroom margins.' },
  { name: 'Upgrade Advisor',     href: '/upgrade-advisor',  icon: 'bi-arrow-up-circle',  short: 'Upgrade Advisor',   blurb: 'See which single upgrade buys you the most frames per dollar on your current PC.' },
  { name: 'PC Value Calculator', href: '/pc-value',         icon: 'bi-cash-coin',        short: 'PC Value',          blurb: 'Estimate what your build is worth today on the second-hand market.' },
  { name: 'VR Ready Test',       href: '/vr-ready',         icon: 'bi-badge-vr',         short: 'VR Ready Test',     blurb: 'Check your PC against Quest Link, Index and Pimax headset requirements.' },
  { name: 'Ray Tracing Check',   href: '/ray-tracing',      icon: 'bi-lightbulb',        short: 'Ray Tracing',       blurb: 'Which ray-traced games your card can actually handle, and at what settings.' },
  { name: 'DLSS vs FSR',         href: '/dlss-fsr',         icon: 'bi-magic',            short: 'DLSS vs FSR',       blurb: 'Pick the right upscaler for your card and see the frame-rate uplift to expect.' },
  { name: 'What Can My PC Run?', href: '/what-can-my-pc-run', icon: 'bi-search',         short: 'What Can I Run',    blurb: 'Enter your specs once and browse every game your machine handles comfortably.' }
];

export interface GameList {
  slug: string;
  title: string;
  h1: string;
  blurb: string;
  icon: string;
  /** Predicate applied to the games table to build the list. */
  filter: (g: any) => boolean;
  sort?: (a: any, b: any) => number;
  /**
   * True when the list depends on a curated feature flag rather than a
   * published requirement, so the page can say the list covers only the titles
   * whose features we have verified.
   */
  featureBased?: boolean;
  /**
   * Explicit membership by Steam appid, for lists that no published field can
   * express. Steam reports a single primary genre and it is "Action" for 357 of
   * the 503 titles we hold, so genre-based membership does not work.
   */
  appids?: number[];
}

/**
 * Requirement fields are null when the publisher did not state something we can
 * measure. These guards exist because JavaScript coerces null to 0 in a numeric
 * comparison — `null <= 30` is true — so a bare `g.min_gpu_score <= 30` would
 * quietly fill "games for low-end PCs" with every unscored title.
 */
const lte = (v: number | null | undefined, n: number) => v != null && v <= n;
const gte = (v: number | null | undefined, n: number) => v != null && v >= n;

/**
 * Demand bands are percentile-based, not absolute.
 *
 * Requirements name the cards that were current when a game shipped, so against
 * a scale anchored to today's flagship the median recommended requirement lands
 * around 9/100. A fixed cut like `min_gpu_score <= 30` therefore swept 237 of
 * 280 scorable games into "games for low-end PCs", which is useless. Ranking
 * within the catalogue keeps these lists meaningful as the catalogue grows.
 */
const pctAtMost = (g: any, n: number) => g.demandPercentile != null && g.demandPercentile <= n;
const pctAtLeast = (g: any, n: number) => g.demandPercentile != null && g.demandPercentile >= n;

export const GAME_LISTS: GameList[] = [
  {
    slug: 'low-end-pc-games',
    title: 'Best Games for Low-End PCs',
    h1: 'Best Games for Low-End PCs in 2026',
    blurb: 'Games that run well on integrated graphics, old GTX cards and office laptops. Every title here has a minimum GPU requirement low enough for entry-level hardware.',
    icon: 'bi-laptop',
    filter: (g) => pctAtMost(g, 0.35),
    sort: (a, b) => (a.demandPercentile ?? 9) - (b.demandPercentile ?? 9)
  },
  {
    slug: 'most-demanding-pc-games',
    title: 'Most Demanding PC Games',
    h1: 'The Most Demanding PC Games in 2026',
    blurb: 'The titles that punish even flagship hardware. Ranked by recommended GPU requirement — these are the games to benchmark a new build with.',
    icon: 'bi-fire',
    filter: (g) => pctAtLeast(g, 0.85),
    sort: (a, b) => (b.demandPercentile ?? -1) - (a.demandPercentile ?? -1)
  },
  {
    slug: 'ray-tracing-games',
    title: 'Games With Ray Tracing',
    h1: 'Every PC Game With Ray Tracing Support',
    blurb: 'Titles with hardware ray tracing, from light reflections to full path tracing. Check the intensity column before turning it on.',
    icon: 'bi-lightbulb',
    filter: (g) => g.supports_ray_tracing === 1,
    featureBased: true,
    sort: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0)
  },
  {
    slug: 'dlss-games',
    title: 'Games With DLSS Support',
    h1: 'PC Games That Support NVIDIA DLSS',
    blurb: 'Every game in our database with DLSS upscaling. On an RTX card this is usually the single biggest free frame-rate win available.',
    icon: 'bi-magic',
    filter: (g) => g.supports_dlss === 1,
    featureBased: true,
    sort: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0)
  },
  {
    slug: 'cpu-intensive-games',
    title: 'CPU-Intensive Games',
    h1: 'The Most CPU-Intensive PC Games',
    blurb: 'Simulation, strategy and open-world titles where the processor, not the graphics card, sets your frame rate. Upgrade priorities differ for these.',
    icon: 'bi-cpu',
    filter: (g) => g.cpu_intensive === 1,
    featureBased: true,
    sort: (a, b) => (b.rec_cpu_score ?? 0) - (a.rec_cpu_score ?? 0)
  },
  {
    slug: 'games-under-8gb-ram',
    title: 'Games That Run on 8GB RAM',
    h1: 'PC Games That Run Fine on 8GB of RAM',
    blurb: 'Still on 8GB? These titles list 8GB or less as their minimum, so you can play now and upgrade memory later.',
    icon: 'bi-memory',
    filter: (g) => lte(g.min_ram_gb, 8),
    sort: (a, b) => (a.min_ram_gb ?? 999) - (b.min_ram_gb ?? 999)
  },
  {
    slug: 'newest-pc-games',
    title: 'Newest PC Games',
    h1: 'Newest PC Game Releases and Their Requirements',
    blurb: 'The most recent releases in our database, with full minimum and recommended system requirements for each.',
    icon: 'bi-stars',
    filter: (g) => gte(g.release_year, 2024),
    sort: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0)
  },
  {
    slug: 'esports-games',
    title: 'Best Esports Games for Any PC',
    h1: 'Esports Games and Their PC Requirements',
    blurb: 'Competitive shooters and MOBAs built to run at high frame rates on modest hardware. Membership is curated: Steam reports one primary genre per title and it is "Action" for most of them, so a genre filter cannot express this list.',
    icon: 'bi-trophy',
    appids: [
      730,      // Counter-Strike 2
      570,      // Dota 2
      1172470,  // Apex Legends
      578080,   // PUBG: BATTLEGROUNDS
      252950,   // Rocket League
      440,      // Team Fortress 2
      1085660,  // Destiny 2
      2357570,  // Overwatch 2
      2073850,  // THE FINALS
      1517290,  // Battlefield 2042
      359550,   // Rainbow Six Siege
      230410,   // Warframe
      386180    // Brawlhalla
    ],
    filter: () => true,
    sort: (a, b) => (a.demandPercentile ?? 9) - (b.demandPercentile ?? 9)
  }
];
