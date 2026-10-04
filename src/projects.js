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
//   blurb     plain-text description
//   url       what `open` launches (also the card's main link)
//   frame     true if the site allows being shown in an iframe: PLAY then runs it inside this
//             page, full screen, in the player (src/player.js). false = it sends
//             X-Frame-Options / frame-ancestors, so it opens in a new tab (and says so).
//             Check with: curl -sI <url> | grep -iE 'x-frame-options|frame-ancestors'
//   links     [{ label, href }]; the first one is the main action and should match `url`
//   image     optional { src, width, height, alt } in public/img/: a game's key art (it fills
//             the screen behind the menu) or a site's 800x420 screenshot (its preview monitor)
//   thumb     optional cartridge label in public/img/thumb/ (420x236 webp)
//   shell     the cartridge's plastic colour; accent: its glow and the wordmark's shadow
//   cast      games only: which of the crew (by `num`) you can play as; drives "in" on Crew
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

// Everyone in the crew. Most games let you play as all six.
const ALL = ['652', '4764', '2564', '723', '555', '85'];
// RadPayne's own roster: the four Radbros (its Retardios moved to RetardioPayne)
const RADBROS = ['652', '4764', '2564', '723'];

export const projects = [
  {
    cmd: 'spidertag',
    boot: 'web-slinger tag on the rooftops, the Robinhood Chain game', // the hero's boot log line
    aliases: ['radrun', 'rad-run', 'rug-run', 'rugrun'],
    slug: 'spidertag',
    group: 'games',
    name: 'SPIDERTAG',
    kind: 'Web-slinger tag on the rooftops, the Robinhood Chain game',
    blurb:
      'Swing the neon rooftops on webs: TAG a friend online or bots, best of three, or chase down the Radbro who swiped your bag in 90 seconds. Five Radbros and the two Retardios to play as. Soon: 1v1 TAG wagers for the $SPIDERTAG token on Robinhood Chain. Runs in the browser, keyboard or controller, nothing to install.',
    url: 'https://spidertag.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://spidertag.vyvanse.beer' },
      { label: '$SPIDERTAG token', href: 'https://token.spidertag.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/radrun' },
    ],
    thumb: '/img/thumb/radrun.webp',
    shell: '#3d2263',
    accent: '#ff5fd2',
    cast: ALL,
    image: {
      src: '/img/art/radrun.webp',
      width: 1600,
      height: 900,
      alt: 'SPIDERTAG: Radbros #4764, #652, #723 and #2564 with the Retardio boys Cousin #555 and Cousin Classic #85 web-swing and wingsuit-glide over rain-slick neon rooftops at dusk.',
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
      "They took the bag. A rainy Manhattan night, the Milady rave, the back of the house, an elevator ride up and Madame Pockit in her penthouse, told in rhyming noir comic panels. Dual pistols, shotguns, a sniper, a kill cam, time slowed down, and #4764's katana that blocks bullets and sends them back. Hold the frag button to see where it lands, let go to throw. Keyboard and mouse or a controller.",
    url: 'https://radpayne.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://radpayne.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/radpayne' },
    ],
    thumb: '/img/thumb/radpayne.webp',
    shell: '#1e2a3b',
    accent: '#7cc4ff',
    cast: RADBROS,
    edition: { label: 'Radbros', face: '4764' },
    image: {
      src: '/img/art/radpayne.webp',
      width: 1600,
      height: 900,
      alt: 'RadPayne: Radbros #4764, #652, #723 and #2564 dive through the rain in bullet time outside a neon nightclub, pistols blazing, shell casings in the air, the Milady gang shooting back.',
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
    blurb:
      'They took the bag. They went back for it. The harder cut of RadPayne, with only the Retardio boys #555 and #85 to play: the same rainy Manhattan night in rhyming noir comic panels, but the gang aim better, react faster, hit harder and come three at a time, and the bosses take more to put down. Keyboard and mouse or a controller.',
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
    blurb:
      'Radbros vs Radbros, 2v2 online (quick play or a friend\'s room) or up to 5 a side with bots. Plant the bomb or defuse it in a desert bazaar, a round at a time. Four Radbros and two Retardios, a gun picked each round, frags you hold to see where they land. Keyboard and mouse (remap any key, side buttons too) or a controller.',
    url: 'https://rbgo.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://rbgo.vyvanse.beer' }],
    thumb: '/img/thumb/rbgo.webp',
    shell: '#5c4228',
    accent: '#f2b45c',
    cast: ALL,
    image: {
      src: '/img/art/rbgo.webp',
      width: 1600,
      height: 900,
      alt: 'RBGO: Radbros #4764, #652, #723 and #2564 with the Retardio boys Cousin #555 and Classic #85 plant the bomb in a sunlit desert bazaar under big painted A and B signs.',
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
    blurb:
      'Radbros vs Radbros, 4v4 or 5v5 online with quick play, bots filling any empty seats. Team Deathmatch in a sun-bleached cul-de-sac: first team to 50. Four Radbros and two Retardios, a gun picked at every spawn, frags you hold to see where they land. Keyboard and mouse (remap any key, side buttons too) or a controller.',
    url: 'https://radops.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radops.vyvanse.beer' }],
    thumb: '/img/thumb/radops.webp',
    shell: '#1d4746',
    accent: '#ff8fb1',
    cast: ALL,
    image: {
      src: '/img/art/radops.webp',
      width: 1600,
      height: 900,
      alt: 'RadOps: Radbros #4764, #652, #723 and #2564 with the Retardio boys Cousin #555 and Classic #85 trade fire across a pastel cul-de-sac, a school bus, a box truck and a water tower behind.',
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
    blurb:
      'Radbros vs the dead: board up the windows, buy doors and guns, and see how many rounds you last. Two maps: a derelict picture palace, nine rooms on one loop (the power, eight perks, two traps, a box of odd guns, a machine that re-cuts yours, a few secrets), or a sandbagged bunker on a dead air base at night, now with a crash-site yard and a cellar. A leaderboard for each. Solo, with a bot, with a friend online (quick play or a room code) or on split screen. Keyboard and mouse or a controller.',
    url: 'https://radzombies.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radzombies.vyvanse.beer' }],
    thumb: '/img/thumb/radzombies.webp',
    shell: '#3c1838',
    accent: '#ff8a3d',
    cast: ALL,
    edition: { label: 'Radbros', face: '4764' },
    image: {
      src: '/img/art/radzombies.webp',
      width: 1600,
      height: 900,
      alt: 'RadZombies: Radbros #4764, #652, #723 and #2564 stand back to back in the auditorium of a derelict neon picture palace, zombie Radbros closing in, their guns crackling fire orange, ice blue and lightning violet.',
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
      'The same zombies game, both maps and everything in them, played as the Retardios: Retardio Cousin #555 or Retardio Cousin Classic #85, the bot teammate and a friend online too. Its own leaderboards and its own online rooms. Keyboard and mouse or a controller.',
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
    boot: 'odd jobs in a tired old four-door', // the hero's boot log line
    aliases: ['beater', 'car'],
    slug: 'shitbox',
    group: 'games',
    name: 'SHITBOX',
    kind: 'Odd jobs in a tired old four-door with a real manual',
    blurb:
      "A 1993 four-door with 218,578 miles, a real manual and $25. Your phone fills up with odd jobs: lifts for people who are online too much, a couch on the roof, a cold wallet that can't take a bump, the airport before the flight. The clutch is going. The junkyard has one. Fix it, or don't. Keyboard, controller or touch.",
    url: 'https://shitbox.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://shitbox.vyvanse.beer' }],
    thumb: '/img/thumb/shitbox.webp',
    shell: '#3a1418',
    accent: '#ffb12a',
    image: {
      src: '/img/art/shitbox.webp',
      width: 1600,
      height: 900,
      alt: 'SHITBOX: a faded red 1993 four-door with its headlights on at night, pulling off the ring road past the pines.',
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
      'Notes fall, you hit them on the line, and the crew plays behind the lanes. Seven original songs, from lo-fi and jungle to guitar rock and an 8-bit level theme, Easy to Expert, in four lanes or seven. Mods, practice loops for the hard parts, bests and a few achievements. Keyboard, controller or touch.',
    url: 'https://radtap.vyvanse.beer',
    frame: true,
    links: [{ label: 'Play', href: 'https://radtap.vyvanse.beer' }],
    thumb: '/img/thumb/radtap.webp',
    shell: '#23163f',
    accent: '#b98cff',
    cast: ALL,
    image: {
      src: '/img/art/radtap.webp',
      width: 1600,
      height: 900,
      alt: 'RADTAP: the crew on a neon stage under coloured spotlights: #723 in his cowboy hat on keys, a Retardio on drums, a Radbro at the mic and #2564 on the decks.',
    },
  },
  {
    cmd: 'solscape',
    boot: 'rev254 server on Solana', // the hero's boot log line
    slug: 'solscape',
    group: 'sites',
    name: 'Solscape',
    kind: 'My open-source, copyright-free rev254 private server, on Solana',
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
export const crew = {
  title: 'The crew',
  line: 'Radbros #652, #4764, #2564 and #723, and Retardios #555 and #85, built in 3D. You play as them in the games.',
  playIn: 'spidertag',
  downloadAll: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbros-3d-all.zip', label: 'all four, one .zip', size: '81 MB' },
  // Where the models live for anyone to use. `license` is the one line shown with it.
  repo: {
    href: 'https://github.com/dexedrne/radbros-3d',
    label: 'Free to use: models on GitHub',
    license: { label: 'Viral Public License', href: 'https://viralpubliclicense.org/VPL.txt' },
    line: 'Rigged and animated. Use them, remix them, put them in your game.',
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
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro652-3d-model-v3.zip', label: '3D model .zip', size: '17 MB' },
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
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro4764-3d-model-v3.zip', label: '3D model .zip', size: '19 MB' },
      featured: true,
      image: {
        src: '/img/radbros/radbro-4764.webp',
        width: 285,
        height: 500,
        alt: 'Radbro #4764 in 3D: violet bob, black sunglasses with skull-print lenses, a nosebleed, a white hoodie covered in blue graffiti scribbles, black jeans and sneakers, and a long katana sheathed at his left hip.',
      },
    },
    {
      num: '2564',
      slug: 'radbro-2564',
      kind: 'Radbro',
      face: '/img/faces/radbro-2564.webp', // 200x200 crop for the character-select tile
      model: '/models/radbro2564-hero.glb',
      name: 'Radbro #2564',
      line: 'The ghost. Foil hat, aviators, RAD RESPONSE vest.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro2564-3d-model.zip', label: '3D model .zip', size: '20 MB' },
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
      line: 'The new guy. Cowboy hat, a wink, HOT TOPIC BRO vest.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro723-3d-model.zip', label: '3D model .zip', size: '21 MB' },
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
      line: 'The original Retardio Cousins, now part of Candy Labs: programmable NFTs with swappable traits. Long brown hair, heart blush, BRITISH FOOD tee.',
      repo: false,
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/retardio555-3d-model.zip', label: '3D model .zip', size: '13 MB' },
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
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/retardio85-3d-model.zip', label: '3D model .zip', size: '12 MB' },
      image: {
        src: '/img/retardios/retardio-85.webp',
        width: 186,
        height: 500,
        alt: 'Retardio #85 in 3D, both arms up in a cheer: long black hair with blunt bangs, blue eyes with pink paint around his right eye and blue around his left, purple freckles, a white NEED MONEY FOR PORSCHE tee, black jeans and black sneakers.',
      },
    },
  ],
};

// The Contact section at the end of the page, and `contact` / `dm` in the terminal.
export const contact = {
  title: 'Contact',
  line: 'DMs are open on X. Questions about the models, a site for your project, or anything else.',
  dm: { label: 'DM me on X', href: 'https://x.com/dexedrne', handle: '@dexedrne' },
  code: { label: 'GitHub', href: 'https://github.com/dexedrne' },
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
