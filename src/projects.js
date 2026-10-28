// Single source of truth for the game-select screen and the terminal.
//
// The screen (games, crew, sites, contact) is rendered into index.html at build time from this
// file (see src/render.js), so every game, model download and link is plain HTML before any JS
// runs. The menu (src/main.js) and Radbro OS (src/os/) read the same data at runtime.
//
// Project fields:
//   cmd       terminal name: `open <cmd>`, `info <cmd>`. Lowercase, no spaces.
//   aliases   optional extra names the terminal accepts
//   slug      anchor id on the page (vyvanse.beer/#slug)
//   group     'games' or 'sites' (see `groups`)
//   name      display name
//   kind      one line saying what it is
//   kindPhone shorter panel kindline on phones; blurbPhone: approved phone-only copy
//   phone     phone art position, keeping the desktop image.position
//   blurb     plain-text description
//   url       what `open` launches (also the card's main link)
//   frame     true if the site allows being shown in an iframe: PLAY then runs it inside this
//             page, full screen, in the player (src/player.js). false = it sends
//             X-Frame-Options / frame-ancestors, so it opens in a new tab (and says so).
//             Check with: curl -sI <url> | grep -iE 'x-frame-options|frame-ancestors'
//   orientation games only: 'landscape' by default; 'any' permits portrait without a lock or hint
//   links     [{ label, href }]; the first one is the main action and should match `url`
//   image     optional { src, width, height, alt } in public/img/: a game's key art (it fills
//             the screen behind the menu) or a site's 800x420 screenshot (its preview monitor)
//   thumb     optional cartridge label in public/img/thumb/ (textless, safe for a centred 4:3 crop)
//   shell     the cartridge's plastic colour; accent: its glow and the wordmark's shadow
//   cast      games only: which of the crew (by `num`) you can play as; drives "in" on Crew
//   featured  games only, on one game: the menu starts on it and its art is painted first
//   asParam   true only when the game supports ?as=<crew num> for character preselection
//   of        games only: the cmd of the game this is an edition of. An edition is its own site,
//             with its own entry here (name, blurb, url, art…), but it shares that game's
//             cartridge: the switch under the wordmark flips between them (RetardioPayne is
//             RadPayne's Retardios edition)
//   edition   a game with editions, on each of them: { label, face } for that switch, `face`
//             being the crew `num` whose face is on its pill
//   credit    optional { before, label, href, after } rendered as one line
//   note      optional plain-text line

export const site = {
  name: 'vyvanse.beer',
  handle: 'dexedrne',
  tagline: 'Games, 3D Radbros and websites by dexedrne.',
  links: [
    { cmd: 'github', label: 'GitHub', href: 'https://github.com/dexedrne' },
    { cmd: 'x', label: 'X', href: 'https://x.com/dexedrne' },
  ],
};

export const groups = [
  { id: 'games', title: 'Games', line: 'Games I make. Free, in the browser, keyboard or controller.' },
  { id: 'sites', title: 'Sites I built', line: 'Websites I made: my own Solscape, and sites for other people’s projects.' },
];

const MAIN_CAST = ['4764', '652', '3704', '3710'];
// The runner and shooters' Crew cards; RadPayne's Retardios are in its own edition.
const RADBROS = [...MAIN_CAST, '723', '2564'];
const ALL = [...RADBROS, '555', '85']; // current game casts; #268 is Crew only

export const projects = [
  {
    cmd: 'spidertag',
    boot: 'swing, tag and chase the crew across the rooftops', // the hero's boot log line
    aliases: ['radrun', 'rad-run', 'rug-run', 'rugrun'],
    slug: 'spidertag',
    group: 'games',
    name: 'SPIDERTAG',
    kind: 'Web-slinger tag across the rooftops',
    kindPhone: "Rooftop web-slinger tag",
    blurb:
      'Swing the neon rooftops on webs: play best-of-three TAG with a friend or bots, or chase down the Radbro who swiped your bag in 90 seconds. Pick from the main four, cowboy #723, ghost #2564 or the two Retardios. Runs in the browser, keyboard or controller, nothing to install.',
    url: 'https://spidertag.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://spidertag.vyvanse.beer' },
      { label: '$SPIDERTAG token', href: 'https://token.spidertag.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/radrun' },
    ],
    thumb: '/img/thumb/radrun-square.webp',
    shell: '#3d2263',
    accent: '#ff5fd2',
    cast: ALL,
    phone: '50% 18%',
    image: {
      src: '/img/art/radrun-cast2.webp',
      width: 1600,
      height: 900,
      alt: 'SPIDERTAG: violet-haired #4764, brown-haired #652, yellow-haired #3704 and green-haired #3710 swing over neon rooftops, with a roadster and cowboy #723 by his truck below.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth.',
    },
  },
  {
    cmd: 'radpayne',
    boot: 'bullet-time noir shooter', // the hero's boot log line
    aliases: ['rad-payne', 'payne'],
    slug: 'radpayne',
    group: 'games',
    name: 'RadPayne',
    kind: 'Bullet-time noir shooter',
    blurb:
      "They took the bag. Follow the crew from a rainy night through a rave and up to Madame Pockit, told in rhyming noir comic panels. The first two chapters play start to finish; chapter two's art and voices are still in progress. Dual pistols, shotguns, a sniper, a kill cam, time slowed down, and #4764's katana that blocks bullets and sends them back. Hold the frag button to see where it lands, let go to throw. Keyboard and mouse or a controller.",
    url: 'https://radpayne.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://radpayne.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/radpayne' },
    ],
    thumb: '/img/thumb/radpayne-square.webp',
    shell: '#1e2a3b',
    accent: '#7cc4ff',
    cast: RADBROS,
    edition: { label: 'Radbros', face: '4764' },
    phone: '50% 24%',
    image: {
      src: '/img/art/radpayne-cast2.webp',
      width: 1600,
      height: 900,
      alt: 'RadPayne: #4764, #652, yellow-haired #3704 and green-haired #3710 dive through neon rain in bullet time, pistols blazing as the Milady gang shoots back.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth. Pockit Miladys by prnth.',
    },
  },
  {
    cmd: 'retardiopayne',
    boot: 'the harder cut, Retardios only', // the hero's boot log line
    aliases: ['retardio-payne', 'rpayne'],
    slug: 'retardiopayne',
    group: 'games',
    of: 'radpayne',
    edition: { label: 'Retardios', face: '85' },
    name: 'RetardioPayne',
    kind: 'Bullet-time noir shooter, the harder cut',
    kindPhone: "Noir shooter, the harder cut",
    blurbPhone: "The harder cut: Retardios only, the same bullet-time noir, meaner rooms.",
    blurb:
      'They took the bag. They went back for it. The harder cut of RadPayne, with only the Retardio boys #555 and #85 to play: the same rainy night in rhyming noir comic panels, but the gang aim better, react faster, hit harder and come three at a time, and the bosses take more to put down. Keyboard and mouse or a controller.',
    url: 'https://retardiopayne.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://retardiopayne.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/radpayne' },
    ],
    thumb: '/img/thumb/retardiopayne.webp',
    shell: '#1f2a44',
    accent: '#ff7ab6',
    cast: ['555', '85'],
    phone: '50% 22%',
    image: {
      src: '/img/art/retardiopayne.webp',
      width: 1600,
      height: 900,
      alt: 'RetardioPayne, the harder cut: Retardio #85 and Retardio #555 dive through the rain in bullet time outside a neon nightclub, pistols blazing, shell casings in the air.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth. Pockit Miladys by prnth.',
    },
  },
  {
    cmd: 'rbgo',
    boot: 'plant or defuse the bomb, 2v2 online', // the hero's boot log line
    aliases: ['rb-go'],
    slug: 'rbgo',
    group: 'games',
    name: 'RBGO',
    kind: 'First-person bomb-defusal shooter, early preview',
    kindPhone: "Bomb-defusal shooter, early preview",
    blurb:
      'Radbros vs Radbros, 2v2 online (quick play or a friend\'s room) or up to 5 a side with bots. Plant the bomb or defuse it in a desert bazaar, a round at a time. Six Radbros and two Retardios, a gun picked each round, frags you hold to see where they land. Keyboard and mouse (remap any key, side buttons too) or a controller.',
    url: 'https://rbgo.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://rbgo.vyvanse.beer' }],
    thumb: '/img/thumb/rbgo-square.webp',
    shell: '#5c4228',
    accent: '#f2b45c',
    cast: ALL,
    phone: '50% 20%',
    image: {
      src: '/img/art/rbgo-cast2.webp',
      width: 1600,
      height: 900,
      alt: 'RBGO: #4764, #652, yellow-haired #3704 and green-haired #3710 plant and defend the bomb in a sunlit bazaar, with #555 by a red roadster and the cowboy by his truck behind.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth. Gun models by Quaternius.',
    },
  },
  {
    cmd: 'radops',
    boot: 'team deathmatch, 5v5 online', // the hero's boot log line
    slug: 'radops',
    group: 'games',
    name: 'RadOps',
    kind: 'First-person team deathmatch, early preview',
    kindPhone: "Team deathmatch, early preview",
    blurb:
      'Radbros vs Radbros, 4v4 or 5v5 online with quick play, bots filling any empty seats. Team Deathmatch in a sun-bleached cul-de-sac: first team to 50. Six Radbros and two Retardios, a gun picked at every spawn, frags you hold to see where they land. Keyboard and mouse (remap any key, side buttons too) or a controller.',
    url: 'https://radops.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radops.vyvanse.beer' }],
    thumb: '/img/thumb/radops-square.webp',
    shell: '#1d4746',
    accent: '#ff8fb1',
    cast: ALL,
    phone: '50% 22%',
    image: {
      src: '/img/art/radops-cast2.webp',
      width: 1600,
      height: 900,
      alt: 'RadOps: #4764, #652, yellow-haired #3704 and green-haired #3710 trade fire across a pastel cul-de-sac, with #555 and #85 behind, a school bus, a roadster and the cowboy\'s truck.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth. Gun models by Quaternius.',
    },
  },
  {
    cmd: 'radzombies',
    boot: 'radbros vs the dead, co-op, leaderboards', // the hero's boot log line
    slug: 'radzombies',
    group: 'games',
    name: 'RadZombies',
    kind: 'First-person zombies survival, early preview',
    kindPhone: "Zombies survival, early preview",
    blurb:
      'Radbros vs the dead: board up the windows, buy doors and guns, and see how many rounds you last. Four maps: a derelict picture palace; nine rooms on one loop with power, perks, traps and secrets; a sandbagged bunker with a crash-site yard and cellar; and Radcension, a launch base that starts black and white until you find the power. Each map has its own leaderboard and a way out at first light for anyone who lasts. Solo, with bots, up to four online (quick play or a room code), or two on split screen with two controllers. Keyboard and mouse or a controller.',
    url: 'https://radzombies.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radzombies.vyvanse.beer' }],
    thumb: '/img/thumb/radzombies-square.webp',
    shell: '#3c1838',
    accent: '#ff8a3d',
    cast: ALL,
    edition: { label: 'Radbros', face: '4764' },
    phone: '50% 22%',
    image: {
      src: '/img/art/radzombies-cast2.webp',
      width: 1600,
      height: 900,
      alt: 'RadZombies: #4764, #652, yellow-haired #3704 and green-haired #3710 stand back to back in a derelict neon picture palace, zombies closing in, their guns crackling orange, blue and violet.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth. Gun models by Quaternius.',
    },
  },
  {
    cmd: 'zombietardio',
    boot: 'retardios vs the dead, their own boards', // the hero's boot log line
    slug: 'zombietardio',
    group: 'games',
    of: 'radzombies',
    edition: { label: 'Retardios', face: '85' },
    name: 'ZombieTardio',
    kind: 'First-person zombies, Retardios only',
    blurb:
      'The same zombies game, all three maps and everything in them, played as the Retardios: Retardio Cousin #555 or Retardio Cousin Classic #85. Solo with the other as your bot teammate, or two players online or on split screen. Its own leaderboards and its own online rooms. Keyboard and mouse or a controller.',
    url: 'https://zombietardio.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://zombietardio.vyvanse.beer' }],
    thumb: '/img/thumb/zombietardio.webp',
    shell: '#2a1c3c',
    accent: '#f2899a',
    cast: ['555', '85'],
    image: {
      src: '/img/art/zombietardio.webp',
      width: 1600,
      height: 900,
      alt: 'ZombieTardio: Retardio Cousin #555 and Retardio Cousin Classic #85 back to back in the auditorium of a derelict neon picture palace, holding off zombie Radbros with a fire gun and a lightning gun.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth. Gun models by Quaternius.',
    },
  },
  {
    cmd: 'shitbox',
    featured: true, // the flagship: the menu opens on it
    boot: '41 cars, free drive with friends and street takeovers', // the hero's boot log line
    aliases: ['beater', 'car'],
    slug: 'shitbox',
    group: 'games',
    name: 'SHITBOX',
    kind: 'Odd jobs in a tired old four-door with a real manual',
    kindPhone: "Odd jobs in a tired old four-door",
    blurbPhone: "Deliveries, rides, towing and the crew on the phone, in a car with a real manual. Keep it running, keep it fuelled, keep the lights on.",
    blurb:
      'A tired 1993 four-door with a real five-speed and 41 cars to keep running. Take odd jobs, tune cars through three upgrade stages per family, or join friends for online free drive, street takeovers and police pursuits. Five cinematic views, including roadside, helicopter, wheel and drift cameras. Play as Retardio Cousin Classic #85 in the career or pick a crew driver online. Keyboard or controller.',
    url: 'https://shitbox.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://shitbox.vyvanse.beer' }],
    thumb: '/img/thumb/shitbox.webp',
    shell: '#3a1418',
    accent: '#ffb12a',
    cast: ALL,
    phone: '50% 40%',
    image: {
      src: '/img/art/shitbox.webp',
      width: 1600,
      height: 900,
      alt: 'SHITBOX: a faded red 1993 four-door with a primer-grey fender parked at a mountain lookout over the town lights at night, Radbro #4764 leaning on the fender and Retardio #85 sitting on the bonnet with a coffee.',
    },
  },
  {
    cmd: 'radtap',
    boot: 'four lanes or seven, the crew on stage', // the hero's boot log line
    aliases: ['rhythm'],
    slug: 'radtap',
    group: 'games',
    name: 'RADTAP',
    kind: 'Rhythm game, four lanes or seven',
    blurb:
      'Notes fall, you hit them on the line, and the crew plays behind the lanes on a real stage. Eight original songs, from lo-fi and jungle to guitar rock, shoegaze and an 8-bit level theme, charted on the beat from Easy to Expert, in four lanes or seven, or two thumbs on a phone. Mods, practice loops for the hard parts, bests and a few achievements. Keyboard, controller or touch.',
    url: 'https://radtap.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radtap.vyvanse.beer' }],
    thumb: '/img/thumb/radtap.webp',
    shell: '#23163f',
    accent: '#b98cff',
    cast: [...MAIN_CAST, '555', '85', '723', '2564'],
    image: {
      src: '/img/art/radtap.webp',
      width: 1600,
      height: 900,
      alt: 'RADTAP: violet-haired #4764, brown-haired #652, yellow-haired #3704 and green-haired #3710 lead the band on a neon stage, with #555, #85 and cowboy #723 supporting behind four glowing note lanes.',
    },
  },
  {
    cmd: 'saloon',
    boot: 'poker at a western saloon table, play with friends', // the hero's boot log line
    // 'pokerbros' is its name from before SALOON: old links, saved orders and commands land here
    aliases: ['pokerbros', 'poker', 'holdem'],
    slug: 'saloon',
    group: 'games',
    name: 'SALOON',
    kind: 'Poker at a western saloon table',
    kindPhone: 'Poker at a western saloon table',
    blurbPhone: 'A poker game at a western saloon table. Play with friends.',
    blurb: 'A poker game at a western saloon table. Play with friends.',
    url: 'https://saloon.cards',
    frame: true,
    orientation: 'any',
    links: [{ label: 'Play', href: 'https://saloon.cards' }],
    thumb: '/img/thumb/saloon.webp',
    shell: '#16251c',
    accent: '#e8c27a',
    cast: [...MAIN_CAST, '555', '85', '723'],
    phone: '50% 35%',
    image: {
      src: '/img/art/saloon.webp',
      width: 1600,
      height: 900,
      alt: 'SALOON: violet-haired #4764 with glasses, brown-haired #652, yellow-haired #3704, green-haired #3710, long-haired #555, black-haired #85 and cowboy #723 play poker round a green felt table in a warm western saloon, with a wooden bar, bottles and glowing oil lamps.',
    },
  },
  {
    cmd: 'radbrawl',
    boot: 'platform fighter, up to four locally across two stages', // the hero's boot log line
    aliases: ['brawl', 'fight', 'smash'],
    slug: 'radbrawl',
    group: 'games',
    name: 'RADBRAWL',
    kind: 'Platform fighter, up to four on one screen',
    kindPhone: "Platform fighter, four on one screen",
    blurb:
      'A platform fighter with the crew on a wet neon rooftop. Up to four on one screen, any mix of keyboards, controllers and CPUs. Damage percent and stocks, launches off the edge, ledges, shields and dodges. #4764 with a katana, #85 with his fists, #723 with a revolver and a lasso, #652, yellow-haired #3704 with a launcher and green-haired #3710 with fan gusts. Training has an input display.',
    url: 'https://radbrawl.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radbrawl.vyvanse.beer' }],
    thumb: '/img/thumb/radbrawl.webp',
    shell: '#2a1e3a',
    accent: '#ff5f9e',
    cast: ['4764', '85', '723', '652', '3704', '3710'],
    edition: { label: 'Platform', face: '723' },
    phone: '50% 22%',
    image: {
      src: '/img/art/radbrawl.webp',
      width: 1600,
      height: 900,
      alt: 'RADBRAWL: Radbro #4764 swings his katana as Retardio #85 throws a punch, sparks where they meet, on a rain-wet neon rooftop at night.',
    },
  },
  {
    cmd: 'radfighter',
    boot: 'one on one on a wet roof', // the hero's boot log line
    aliases: ['fighter', 'rad-fighter'],
    slug: 'radfighter',
    group: 'games',
    of: 'radbrawl',
    edition: { label: 'One on one', face: '4764' },
    name: 'RAD FIGHTER',
    kind: 'Anime fighting game, one on one, early build',
    blurb:
      'The first fighter: one on one on a rain-wet rooftop, drawn like an anime fighter. #4764 with the katana and a slash he can throw, #85 up close with a command grab. Six buttons, chains, launchers and air combos, supers, best of three, a CPU on three levels and training with frame data. Keyboard or controller.',
    url: 'https://radfighter.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radfighter.vyvanse.beer' }],
    thumb: '/img/thumb/radfighter.webp',
    shell: '#1e2240',
    accent: '#5fd0ea',
    cast: ['4764', '85'],
    image: {
      src: '/img/art/radfighter.webp',
      width: 1600,
      height: 900,
      alt: 'RAD FIGHTER: in the game, Radbro #4764 raises his katana and sends a crescent of light at Retardio #85 on a rain-wet rooftop under the moon.',
    },
  },
  {
    cmd: 'radbonk',
    boot: 'fifteen minutes against the horde', // the hero's boot log line
    aliases: ['bonk', 'survivors'],
    slug: 'radbonk',
    group: 'games',
    name: 'RADBONK',
    kind: 'Survival romp, the crew against a cute monster horde',
    kindPhone: 'Survival romp against the horde',
    blurb:
      'Fifteen minutes on a bright hilltop against a horde of cute monsters. Pick a Radbro or Retardio, keep moving, grab the gems and stack your weapons until they evolve. A new map every run, three bosses, chill music that picks up as it gets wild.',
    url: 'https://radbonk.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radbonk.vyvanse.beer' }],
    thumb: '/img/thumb/radbonk.webp',
    shell: '#1d2a3a',
    accent: '#7be08a',
    cast: ['3710', '3704', '4764', '85', '723', '652'],
    image: {
      src: '/img/art/radbonk.webp',
      width: 1600,
      height: 900,
      alt: 'RADBONK: Radbro #3710 swings a stone hammer and #3704 fires a launcher on a sunny hilltop, surrounded by cute skeletons, ghosts, slimes, bats, gems and an open treasure chest.',
    },
  },
  {
    cmd: 'solscape',
    boot: 'rev254 server on Solana', // the hero's boot log line
    slug: 'solscape',
    group: 'sites',
    name: 'Solscape',
    kind: 'My open-source, copyright-free rev254 private server, on Solana',
    kindPhone: "Open-source rev254 server on Solana",
    blurb:
      'An open-source, copyright-free rev254 private server with a Solana twist. Create an account, train skills, take on quests and explore with other players.',
    url: 'https://play.solscape.fun',
    // its sign-in and wallets want a tab of their own, and solscape.fun refuses framing
    frame: false,
    links: [
      { label: 'Play', href: 'https://play.solscape.fun' },
      { label: 'Site', href: 'https://www.solscape.fun' },
      { label: '$XP on pump.fun', href: 'https://pump.fun/coin/9spN3Lrz4tnFXaXfR9QzKdiMd2hE4AUbAJntui21pump' },
    ],
    thumb: '/img/thumb/solscape.webp',
    shell: '#262046',
    accent: '#5fe3d0',
    phone: '50% 42%',
    phoneImage: '/img/solscape.webp',
    image: {
      src: '/img/art/solscape.webp',
      width: 1600,
      height: 840,
      alt: 'Solscape login screen: the glowing Solscape logo over a harbor town at dusk, with Create account and Existing User buttons.',
    },
  },
  {
    cmd: 'bitcorn',
    slug: 'bitcorn',
    group: 'sites',
    name: 'bitcorn',
    kind: 'Project site with a 3D corn maze and a pixel farm',
    blurb: 'Run Cornelius’s 3D corn maze, find Husk, chat by the fence, and grow a pixel farm.',
    url: 'https://bitcorn.lol/maze',
    frame: false,
    links: [
      { label: 'Run the maze', href: 'https://bitcorn.lol/maze' },
      { label: 'Site', href: 'https://bitcorn.lol' },
    ],
    thumb: '/img/thumb/bitcorn.webp',
    accent: '#f4c84a',
    image: {
      src: '/img/bitcorn.webp',
      width: 800,
      height: 420,
      alt: 'The bitcorn home page: “Welcome to corn country” over a pixel-art cornfield with a red barn.',
    },
  },
  {
    cmd: 'bulk',
    aliases: ['bulkos', 'bulk-os'],
    slug: 'bulk-os',
    group: 'sites',
    name: 'bulk',
    kind: 'Project site, web desktop and sprite games',
    blurb:
      'A web “OS” packed with games and toys, from back when every asset was made separately and hand-edited into sprites in GIMP.',
    url: 'https://www.bulked.lol/os',
    frame: true,
    links: [
      { label: 'Open', href: 'https://www.bulked.lol/os' },
      { label: 'Site', href: 'https://www.bulked.lol' },
    ],
    thumb: '/img/thumb/bulk.webp',
    accent: '#b07cff',
    image: {
      src: '/img/bulk.webp',
      width: 800,
      height: 420,
      alt: 'The bulk web desktop at night: a column of app icons, a big moon over a city skyline, and an open Games window with purple pixel-art cards for Bulk Runner, Super Bulk Bros, Flappy Bulk, Bulk Climb and Bulkagachi.',
    },
  },
  {
    cmd: 'bulkagachi',
    aliases: ['bulk-pet'],
    slug: 'bulkagachi',
    group: 'sites',
    name: 'bulkagachi',
    kind: 'Pixel virtual pet for the BULK project',
    blurb: 'Hatch your Bulk, then feed it, play with it, clean it and put it to bed by the fire.',
    url: 'https://www.bulked.lol/games/bulkagachi',
    frame: true,
    links: [{ label: 'Play', href: 'https://www.bulked.lol/games/bulkagachi' }],
    thumb: '/img/thumb/bulkagachi.webp',
    accent: '#e08bff',
    image: {
      src: '/img/bulkagachi.webp',
      width: 800,
      height: 420,
      alt: 'Bulkagachi: a purple egg on a rug in a pixel-art log cabin with a stone fireplace, a sleeping cat and toys, under the Bulkagachi title bar.',
    },
  },
  {
    cmd: 'sanic',
    slug: 'sanic',
    group: 'sites',
    name: 'sanic',
    kind: 'Project site with a playable WebGL ring runner',
    blurb:
      'Run the trenches, stack rings, and go irresponsibly fast. The runner plays right on the landing page.',
    url: 'https://www.sanic.fun',
    frame: false,
    links: [{ label: 'Play', href: 'https://www.sanic.fun' }],
    thumb: '/img/thumb/sanic.webp',
    accent: '#4f8dff',
    image: {
      src: '/img/sanic.webp',
      width: 800,
      height: 420,
      alt: 'The sanic ring runner landing page, with its retro blue title panel and yellow Press Start button on the left, and the 3D WebGL runner on the right: a blue hedgehog running down a dirt road through low-poly trees with gold rings floating ahead.',
    },
  },
  {
    cmd: 'hog',
    aliases: ['hogrider', 'hog-rider'],
    slug: 'hog',
    group: 'sites',
    name: 'hog rider 3d',
    kind: 'Handlebar-view highway runner for the HOG project',
    blurb: 'Weave through traffic on a sunset highway, dodge left and right, boost with space.',
    url: 'https://www.crankmyhog.lol/assets/hog-rider-3d/index.html',
    frame: true,
    links: [{ label: 'Ride', href: 'https://www.crankmyhog.lol/assets/hog-rider-3d/index.html' }],
    thumb: '/img/thumb/hog.webp',
    accent: '#ff9d5c',
    image: {
      src: '/img/hog.webp',
      width: 800,
      height: 420,
      alt: 'Hog rider 3d mid-ride: the view over chrome motorcycle handlebars down a highway, a purple car ahead, pine trees, low-poly mountains and a blue sky, with the score and hearts at the top.',
    },
  },
];

// The Radbros, rendered in 3D with transparent backgrounds.
// `num` is what the terminal takes (`info 4764`). `featured` = the site mascot (picked first
// on Crew). The games each one is in come from the games' `cast`. `model` is the small web
// model (mesh, Idle and Big_Wave_Hello) that stands on his card in 3D, loaded when first shown;
// `image` is his render, shown until then (and without WebGL).
// The site's downloadable asset release.
const REL = 'https://github.com/dexedrne/vyvanse.beer/releases/download/assets';

export const crew = {
  assets: {
    title: 'Assets',
    // the no-JS panel line, the terminal's `assets` header and the ask payload
    line: 'Art from the games, free for the Radbro community. Use it, remix it, credit @dexedrne on X.',
    credit: { label: '@dexedrne on X', href: 'https://x.com/dexedrne' },
    all: { href: `${REL}/vyvanse-assets-all-current.zip`, label: 'every pack, one .zip', size: '580 MB' },
    packs: [
      {
        id: 'saloon-card-pack', // hash #crew/saloon-card-pack, terminal `info saloon-card-pack`, ask `pack:saloon-card-pack`
        slug: 'pack-saloon-card-pack', // DOM id; never collides with radbro-*/retardio-* or a project slug
        kind: 'SALOON · card pack', // kindline
        name: 'Radbro Deck', // wordmark: short, one line at 116px (≤ 12 characters)
        title: 'SALOON Card Pack: The Radbro Deck', // full name: aria, terminal, toast, ask
        line: 'The 52-card Radbro deck from SALOON, with alternate fronts, two jokers and four card backs.',
        big: '52', // the outlined number behind the cover
        accent: '#e8c27a', // SALOON's: the wordmark's offset shadow and the pack's foil
        shell: '#16251c', // SALOON's: the tile's wrapper colour
        games: ['saloon'], // "from" spines (project cmds)
        crew: ['4764', '652', '3704', '3710', '723', '555', '85'], // "with" mugs (crew nums)
        contents: [
          { path: 'deck/', what: '52 cards, ace to king' },
          { path: 'deck/alt/', what: 'alternate card fronts' },
          { path: 'jokers/ backs/', what: 'two jokers and four backs' },
          { path: 'webp/', what: 'the cards and backs as WebP' },
        ],
        tile: '/img/packs/saloon-card-pack-tile.webp', // 144x240
        cover: {
          src: '/img/packs/saloon-card-pack.webp',
          width: 960,
          height: 720,
          phone: '/img/packs/saloon-card-pack-phone.webp', // 540x720, phones held upright
          alt: 'A poker hand fanned out: a violet skull card back, the seven of hearts, the queen of diamonds with #652, the #85 joker and the king of spades with #4764 on top.',
        },
        backdrop: '/img/art/saloon.webp', // soft-blurred behind the panel while the pack is picked
        download: { href: `${REL}/saloon-card-fronts-backs.zip`, label: 'card pack .zip', size: '81 MB', files: 126, formats: 'png, webp and svg' },
      },
      {
        id: 'wallpapers',
        slug: 'pack-wallpapers',
        kind: 'Games · wallpaper pack',
        name: 'Wallpapers',
        title: 'Wallpapers',
        line: 'Game key art, phone posters and rainy-night scenes in one pack. Desktop, phone and extra backgrounds from across the games.',
        big: '105',
        accent: '#b98cff',
        shell: '#23163f',
        games: ['saloon', 'shitbox', 'radtap', 'radbrawl', 'radbonk', 'spidertag', 'rbgo', 'radpayne', 'retardiopayne', 'radops', 'radzombies'],
        crew: ['4764', '652', '3704', '3710', '2564', '723', '555', '85', '268'],
        contents: [
          { path: 'game-key-art/', what: 'desktop, phone and extra backgrounds' },
          { path: 'moody-nights/3840x2160/', what: 'eight rainy-night wallpapers' },
          { path: 'moody-nights/2560x1440/', what: 'the same eight, smaller' },
        ],
        tile: '/img/packs/wallpapers-tile.webp',
        cover: {
          src: '/img/packs/wallpapers.webp',
          width: 960,
          height: 720,
          phone: '/img/packs/wallpapers-phone.webp',
          alt: 'Four game wallpapers fanned out as cards: a neon rooftop chase, a poker game, a rainy roadster and the crew in a music venue.',
        },
        backdrop: '/img/art/shitbox.webp',
        download: { href: `${REL}/wallpapers.zip`, label: 'wallpaper pack .zip', size: '132 MB', files: 105, formats: 'png, webp and jpg' },
      },
      {
        id: 'retardio-sticker-pack',
        slug: 'pack-retardio-sticker-pack',
        kind: 'Retardio · sticker pack',
        name: 'Stickers',
        title: 'Retardio Sticker Pack',
        line: '94 stickers of #85 and his cousin #268, ready for Telegram or anywhere.',
        big: '94',
        accent: '#ff7ab6',
        shell: '#1f2a44',
        games: [],
        crew: ['85', '268'],
        contents: [
          { path: 'telegram-png-512/', what: 'ready to upload to Telegram' },
          { path: 'webp-512/', what: 'the same stickers, as webp' },
          { path: 'preview.png', what: 'contact sheet' },
          { path: 'README.md LICENSE', what: 'credits and licence' },
        ],
        tile: '/img/packs/retardio-sticker-pack-tile.webp',
        cover: {
          src: '/img/packs/retardio-sticker-pack.webp',
          width: 960,
          height: 720,
          phone: '/img/packs/retardio-sticker-pack-phone.webp', // 540x720, phones held upright
          alt: 'Five die-cut stickers of Retardio #85 in a heap: it’s over, laughing and crying, a thumbs up, unbothered and a poker face.',
        },
        backdrop: '/img/art/retardiopayne.webp',
        download: { href: `${REL}/retardio-sticker-pack.zip`, label: 'sticker pack .zip', size: '54 MB', files: 193, formats: 'png and webp' },
      },
      {
        id: 'radbro-sticker-pack',
        slug: 'pack-radbro-sticker-pack',
        kind: 'Radbro · sticker pack',
        name: 'Stickers',
        title: 'Radbro Sticker Pack',
        line: '92 stickers: the six crew Radbros plus SALOON, SHITBOX and Sanko designs. Ready for Telegram or anywhere.',
        big: '92',
        accent: '#9d8cff',
        shell: '#1f2a44',
        games: [],
        crew: ['4764', '652', '723', '3704', '3710', '2564'],
        contents: [
          { path: 'telegram-png-512/', what: 'ready to upload to Telegram' },
          { path: 'webp-512/', what: 'the same stickers, as webp' },
          { path: 'preview.png', what: 'contact sheet' },
          { path: 'README.md LICENSE', what: 'credits and licence' },
        ],
        tile: '/img/packs/radbro-sticker-pack-tile.webp',
        cover: {
          src: '/img/packs/radbro-sticker-pack.webp',
          width: 960,
          height: 720,
          phone: '/img/packs/radbro-sticker-pack-phone.webp', // 540x720, phones held upright
          alt: 'Five die-cut Radbro stickers in a heap: #652 saying WTF, #4764 holding CASH MONEY, #723 tipping his hat with HOWDY, #652 locked in on a laptop and #2564 playing ONE MORE GAME.',
        },
        backdrop: '/img/art/radrun-cast2.webp',
        download: { href: `${REL}/radbro-sticker-pack-v2.zip`, label: 'sticker pack .zip', size: '60 MB', files: 189, formats: 'png and webp' },
      },
      {
        id: 'shitbox-garage-pack',
        slug: 'pack-shitbox-garage-pack',
        kind: 'SHITBOX · art pack',
        name: 'Garage',
        title: 'SHITBOX Garage Pack',
        line: 'Original SHITBOX art: the intro comic, the crew’s story paintings, made-up licence plates and bumper stickers, loading screens, HUD icons and painted world maps.',
        big: '185',
        accent: '#ffb12a',
        shell: '#3a1418',
        games: ['shitbox'],
        crew: ['4764', '652', '3704', '3710', '2564', '723', '555', '85'],
        contents: [
          { path: '01-intro-comic/', what: 'eight pages and a cover' },
          { path: '02-story-paintings/', what: 'the crew’s story paintings' },
          { path: '03-license-plates/', what: 'made-up licence plates' },
          { path: '04 … 08/', what: 'stickers, loading screens, icons, maps', sum: true }, // a summary line: hidden once the full list shows
          { path: '04-bumper-stickers/', what: 'bumper stickers', more: true },
          { path: '05-loading-screens/', what: 'eight loading screens', more: true },
          { path: '06-menu-backgrounds/', what: 'menu backgrounds', more: true },
          { path: '07-icons/', what: 'phone, HUD and map icons', more: true },
          { path: '08-world-paintings/', what: 'painted world maps', more: true },
        ],
        tile: '/img/packs/shitbox-garage-pack-tile.webp',
        cover: {
          src: '/img/packs/shitbox-garage-pack.webp',
          width: 960,
          height: 720,
          phone: '/img/packs/shitbox-garage-pack-phone.webp', // 540x720, phones held upright
          alt: 'A SHITBOX comic page of #85 driving at sunset over a story painting of #4764’s lockup, with an HXP 193 licence plate and PUDDLE CLUB and RUST BUDGET bumper stickers in front.',
        },
        backdrop: '/img/art/shitbox.webp',
        download: { href: `${REL}/shitbox-garage-pack.zip`, label: 'garage pack .zip', size: '204 MB', files: 187, formats: 'png' },
        // a second, smaller link under the status line (p.lite): the same 185 images as webp
        lite: { href: `${REL}/shitbox-garage-pack-lite.zip`, label: 'same art as webp, one .zip', size: '25 MB', files: 187, formats: 'webp' },
      },
      {
        id: 'cars',
        slug: 'pack-cars',
        kind: 'SHITBOX · 3D models',
        name: 'Cars',
        title: 'SHITBOX Cars',
        line: 'All 35 drivable SHITBOX cars as individual GLB models, each named after the real car it is based on, with the in-game names in CARS.csv and source credits and licence terms in the zip README.',
        big: '35',
        accent: '#ffb12a',
        shell: '#3a1418',
        games: ['shitbox'],
        crew: [],
        licenseText: 'Owner permission granted to redistribute. Source credits and original licence terms are in the zip README.',
        contents: [
          { path: 'cars/', what: '35 GLB models named after the real cars' },
          { path: 'CARS.csv', what: 'file, real car, in-game name, year and credit' },
          { path: 'README.md', what: 'credits and licence terms' },
        ],
        tile: '/img/packs/gallery/cars/honda-accord-1993.webp',
        cover: {
          src: '/img/packs/gallery/cars/honda-accord-1993.webp',
          width: 640,
          height: 480,
          phone: '/img/packs/gallery/cars/honda-accord-1993.webp',
          alt: 'A red four-door car in a neutral studio render.',
        },
        backdrop: '/img/art/shitbox.webp',
        download: { href: `${REL}/cars-all.zip`, label: 'car models .zip', size: '49 MB', files: 37, formats: 'GLB' },
      },
    ],
  },

  title: 'The crew',
  line: 'The main four: #4764, #652, yellow-haired #3704 and green-haired #3710. With Retardio Cousin #555 and his Miata, Retardio Cousin Classic #85 and his cousin #268, truck guy #723 and rare ghost #2564. All nine built in 3D, rigged and animated.',
  playIn: 'spidertag',
  downloadAll: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/crew-3d-all-nine.zip', label: 'all nine, one .zip', size: '269.7 MB' },
  // Where the models live for anyone to use. `license` is the one line shown with it.
  repo: {
    href: 'https://github.com/dexedrne/radbros-3d',
    label: 'Free to use: models on GitHub',
    license: { label: 'Viral Public License', href: 'https://viralpubliclicense.org/VPL.txt' },
    line: 'Six Radbros in the repo; the three Retardios are built on the Radbro rig. Rigged and animated. Use them, remix them, put them in your game.',
  },
  members: [
    {
      num: '652',
      slug: 'radbro-652',
      kind: 'Radbro',
      face: '/img/faces/radbro-652.webp', // 200x200 crop for the character-select tile
      model: '/models/radbro652-hero.glb',
      name: 'Radbro #652',
      line: 'Brown mop, big blue eyes, the Nobody sweatshirt.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro652-3d-model-v3.zip', label: '3D model .zip', size: '27 MB' },
      image: {
        src: '/img/radbros/radbro-652.webp',
        width: 267,
        height: 500,
        alt: 'Radbro #652 in 3D: shaggy brown hair, big blue anime eyes under thick angled brows, a black Nobody sweatshirt, brown trousers and boots, one arm raised in a cheer.',
      },
    },
    {
      num: '4764',
      slug: 'radbro-4764',
      kind: 'Radbro',
      face: '/img/faces/radbro-4764.webp', // 200x200 crop for the character-select tile
      model: '/models/radbro4764-hero.glb',
      name: 'Radbro #4764',
      line: 'Skull shades, scribble hoodie, katana at his left hip.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro4764-3d-model-v3.zip', label: '3D model .zip', size: '29 MB' },
      featured: true,
      image: {
        src: '/img/radbros/radbro-4764.webp',
        width: 285,
        height: 500,
        alt: 'Radbro #4764 in 3D: violet bob, black sunglasses with skull-print lenses, a nosebleed, a white hoodie covered in blue graffiti scribbles, black jeans and sneakers, and a long katana sheathed at his left hip.',
      },
    },
    {
      num: '3704',
      slug: 'radbro-3704',
      kind: 'Radbro',
      face: '/img/faces/radbro-3704.webp',
      model: '/models/radbro3704-hero.glb',
      name: 'Radbro #3704',
      line: 'Golden yellow hair, amber eyes, green rings on a black tee and olive cargo trousers.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro3704-3d-model.zip', label: '3D model .zip', size: '50 MB' },
      image: {
        src: '/img/radbros/radbro-3704.webp', width: 295, height: 500,
        alt: 'Radbro #3704 in 3D: golden yellow bob, amber eyes, a black green-ring tee, olive cargo trousers and black boots, waving hello.',
      },
    },
    {
      num: '3710',
      slug: 'radbro-3710',
      kind: 'Radbro',
      face: '/img/faces/radbro-3710.webp',
      model: '/models/radbro3710-hero.glb',
      name: 'Radbro #3710',
      line: 'Mint green hair, amber eyes, the Nobody picture tee and dark trousers.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro3710-3d-model.zip', label: '3D model .zip', size: '33 MB' },
      image: {
        src: '/img/radbros/radbro-3710.webp', width: 307, height: 500,
        alt: 'Radbro #3710 in 3D: mint green bob, amber eyes, a black Nobody picture tee, blue jeans and white sneakers, waving hello.',
      },
    },
    {
      num: '2564',
      slug: 'radbro-2564',
      kind: 'Radbro',
      face: '/img/faces/radbro-2564.webp', // 200x200 crop for the character-select tile
      model: '/models/radbro2564-hero.glb',
      name: 'Radbro #2564',
      line: 'The rare ghost. Foil hat, aviators, RAD RESPONSE vest.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro2564-3d-model.zip', label: '3D model .zip', size: '29 MB' },
      image: {
        src: '/img/radbros/radbro-2564.webp',
        width: 265,
        height: 500,
        alt: 'Radbro #2564, the ghost, in 3D: white face, pale lavender hair under a crumpled tin-foil hat and white kufi, black aviators, and a RAD RESPONSE plate carrier, one arm held out.',
      },
    },
    {
      num: '723',
      slug: 'radbro-723',
      kind: 'Radbro',
      face: '/img/faces/radbro-723.webp', // 200x200 crop for the character-select tile
      model: '/models/radbro723-hero.glb',
      name: 'Radbro #723',
      line: 'The truck guy. Cowboy hat, a wink, a black vest and an old pickup.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro723-3d-model.zip', label: '3D model .zip', size: '30 MB' },
      image: {
        src: '/img/radbros/radbro-723.webp',
        width: 336,
        height: 500,
        alt: 'Radbro #723 in 3D, tipping his hat: a brown wide-brim cowboy hat over shaggy brown hair, one big amber anime eye open and the other winking, and a black plate carrier with a HOT TOPIC BRO name patch and a TempleOS patch over a black shirt, dark jeans and brown boots.',
      },
    },
    // The Retardios (Retardio Cousin #555, the original collection, now Candy Labs' programmable one; and
    // Retardio Cousin Classic #85, the original artist's true-to-the-original relaunch): built on the Radbro rig, not part of the
    // radbros-3d repo (`repo: false`). Their download is a package like the Radbros' (static, rigged and
    // animated .glb, a preview, README and the license) on the same radbros-3d release.
    {
      num: '555',
      slug: 'retardio-555',
      kind: 'Retardio Cousin',
      face: '/img/faces/retardio-555.webp', // 200x200 crop for the character-select tile
      model: '/models/retardio555-hero.glb',
      name: 'Retardio Cousin #555',
      line: 'The original Retardio Cousins, now part of Candy Labs: programmable NFTs with swappable traits. Long brown hair, heart blush, BRITISH FOOD tee, and a red Miata.',
      repo: false,
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/retardio555-3d-model.zip', label: '3D model .zip', size: '21 MB' },
      image: {
        src: '/img/retardios/retardio-555.webp',
        width: 312,
        height: 500,
        alt: 'Retardio #555 in 3D, waving: long straight brown hair, grey-green anime eyes, a double ring piercing at the end of his right brow, pink heart blush, a :3 mouth, a white BRITISH FOOD tee with a vomiting emoji, light-blue jeans and white sneakers.',
      },
    },
    {
      num: '85',
      slug: 'retardio-85',
      kind: 'Retardio Cousin Classic',
      face: '/img/faces/retardio-85.webp', // 200x200 crop for the character-select tile
      model: '/models/retardio85-hero.glb',
      name: 'Retardio Cousin Classic #85',
      line: 'Retardio Cousin Classic: the original artist’s true-to-the-original relaunch. Long black hair, face paint, NEED MONEY FOR PORSCHE tee.',
      repo: false,
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/retardio85-3d-model.zip', label: '3D model .zip', size: '20 MB' },
      image: {
        src: '/img/retardios/retardio-85.webp',
        width: 186,
        height: 500,
        alt: 'Retardio #85 in 3D, both arms up in a cheer: long black hair with blunt bangs, blue eyes with pink paint around his right eye and blue around his left, purple freckles, a white NEED MONEY FOR PORSCHE tee, black jeans and black sneakers.',
      },
    },
    {
      num: '268',
      slug: 'retardio-268',
      kind: 'Retardio Classic',
      face: '/img/faces/retardio-268.webp',
      model: '/models/retardio268-hero.glb',
      name: 'Retardio Classic #268',
      line: '#85’s cousin. He keeps a FREE MITCH poster.',
      repo: false,
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/retardio268-3d-model.zip', label: '3D model .zip', size: '31 MB' },
      image: {
        src: '/img/retardios/retardio-268.webp',
        width: 310,
        height: 500,
        alt: 'Retardio Classic #268 in 3D, waving hello: black hair with blunt bangs, olive green eyes with blue tears, a lit cigarette, a white NEED MONEY FOR PORSCHE tee, black trousers and black sneakers with white soles.',
      },
    },
  ],
  npcs: [
    {
      num: 'chudjak',
      label: 'Chudjak',
      slug: 'chudjak',
      kind: 'Owner character · NPC',
      npcOnly: true,
      face: '/img/chudjak.webp',
      model: '/models/chudjak.glb',
      download: { href: '/models/chudjak-rigged.glb', label: 'rigged and animated .glb', size: '8.2 MB', rigged: true },
      name: 'Chudjak',
      line: 'Chudjak is joining RadQuest (Rad Hamlet), RADBONK and SHITBOX. Free to use: download the rigged 3D model with idle, walk, run and greeting animations.',
      image: { src: '/img/chudjak.webp', width: 800, height: 1000, alt: 'Chudjak: a stern, pale man with swept hair and glasses, wearing a black slogan shirt, jeans and sneakers.' },
    },
    {
      num: 'ophelia',
      label: 'Ophelia',
      slug: 'ophelia',
      kind: 'SHITBOX guide · NPC',
      npcOnly: true,
      face: '/img/faces/ophelia.webp',
      model: '/models/ophelia.glb',
      name: 'Ophelia',
      line: 'The SHITBOX guide joins the crew. Long black hair, amber eyes and a black tank top. Say hello and she waves back.',
      image: { src: '/img/ophelia.webp', width: 800, height: 1000, alt: 'Ophelia in 3D: long black hair, amber eyes, a black tank top, dark trousers and boots.' },
    },
  ],
};

// The Contact section at the end of the page, and `contact` / `dm` in the terminal.
export const contact = {
  title: 'Contact',
  line: 'DMs are open on X. Questions about the models, a site for your project, or anything else.',
  dm: { label: 'DM me on X', href: 'https://x.com/dexedrne', handle: '@dexedrne' },
  code: { label: 'GitHub', href: 'https://github.com/dexedrne' },
  remilia: { label: 'Remilia', href: 'https://www.remilia.net/~dexedrne', note: 'my page on remilia.net' },
  axiom: { label: 'Axiom', href: 'https://axiom.trade/@vyvanse', note: 'trade with my referral' },
  pumpfun: { label: 'pump.fun', href: 'https://pump.fun/join/vyvanse', note: 'join with my referral' },
};

// #4764 and #85 stand on the puddle together on Games and Contact, live in 3D (src/duo.js).
// Their renders are the poster pair until the models load (and all there is without WebGL).
export const duo = ['4764', '85'];

// #4764's big render: the share card's alt and the terminal's neofetch use it.
export const mascot = {
  src: '/img/radbros/radbro-4764-hero.webp',
  width: 719,
  height: 1100,
  alt: 'Radbro #4764 in 3D, waving hello: violet bob, black sunglasses with skull-print lenses, a white hoodie covered in blue graffiti scribbles, black jeans, and a long katana sheathed at his left hip.',
  model: '/models/radbro4764-hero.glb',
};

// The games as the menu shows them: one cartridge per game, each the list of its editions (the
// game's own entry first, then every entry whose `of` is its cmd; most games have just the one).
export function shelf(projects) {
  const games = projects.filter((p) => p.group === 'games');
  return games.filter((g) => !g.of).map((g) => [g, ...games.filter((e) => e.of === g.cmd)]);
}

// The games one of the crew is in, one per game: of a game's editions, the one made for him (the
// smallest cast he's in). Retardio #85 is in RetardioPayne and ZombieTardio, Radbro #4764 in
// RadPayne and RadZombies.
export function playsIn(projects, num) {
  return shelf(projects)
    .map((eds) => eds.filter((e) => e.cast?.includes(num)).sort((a, b) => a.cast.length - b.cast.length)[0])
    .filter(Boolean);
}

// Host shown in lists and window title bars: "radrun.vyvanse.beer", "bulked.lol/os".
export function shortUrl(href) {
  const u = new URL(href);
  const parts = u.pathname.replace(/\/index\.html?$/, '').split('/').filter(Boolean);
  // Deep links read as host/…/last-segment so the card line stays short.
  const path = parts.length > 2 ? `/…/${parts[parts.length - 1]}` : parts.map((p) => `/${p}`).join('');
  return u.host.replace(/^www\./, '') + path;
}
