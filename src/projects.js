// Single source of truth for the page and the terminal.
//
// The landing (hero, project lists, crew, footer) is rendered into index.html at build time
// from this file (see src/render.js), and the terminal (src/commands.js) reads the same data
// at runtime, so a project added here shows up in both.
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
//   frame     true if the site allows being shown in an iframe. Everything opens in a new tab;
//             frame: true also lets it run in an in-page window when asked (`win <cmd>`, the
//             card's "In a window" button, or `set windows on`). false = it sends
//             X-Frame-Options / frame-ancestors, so it's only ever a new tab.
//             Check with: curl -sI <url> | grep -iE 'x-frame-options|frame-ancestors'
//   links     [{ label, href }]; the first one is the main action and should match `url`
//   image     optional { src, width, height, alt } in public/img/ (800px wide, ~1.9:1)
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
  { id: 'games', title: 'Games', line: 'Games I make. They run in a browser tab.' },
  { id: 'sites', title: 'Sites I built', line: 'Websites I made for other people’s projects.' },
];

export const projects = [
  {
    cmd: 'radrun',
    aliases: ['rug-run', 'rugrun'],
    slug: 'radrun',
    group: 'games',
    name: 'RadRun',
    kind: 'Radbro rooftop chase, free-swing 3D browser game',
    blurb:
      'He swiped your bag. You get 90 seconds to swing across the rooftops and take it back. Runs in the browser, nothing to install.',
    url: 'https://radrun.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://radrun.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/radrun' },
    ],
    image: {
      src: '/img/radrun.jpg',
      width: 1200,
      height: 630,
      alt: 'RadRun: a Radbro swings on a rope between city rooftops, chasing the thief who took the bag.',
    },
    credit: {
      before: 'Built on',
      label: 'react-three-game',
      href: 'https://prnth.com/react-three-game/',
      after: 'by prnth.',
    },
  },
  {
    cmd: 'solscape',
    slug: 'solscape',
    group: 'games',
    name: 'Solscape',
    kind: 'My open-source, copyright-free rev254 private server, on Solana',
    blurb:
      'An open-source, copyright-free rev254 private server with a Solana twist. Create an account, train skills, take on quests and explore with other players.',
    url: 'https://play.solscape.fun',
    frame: true,
    links: [
      { label: 'Play', href: 'https://play.solscape.fun' },
      { label: 'Site', href: 'https://www.solscape.fun' },
    ],
    image: {
      src: '/img/solscape.webp',
      width: 800,
      height: 420,
      alt: 'Solscape login screen: the glowing Solscape logo over a harbor town at dusk, with Create account and Existing User buttons.',
    },
  },
  {
    cmd: 'bitcorn',
    slug: 'bitcorn',
    group: 'sites',
    name: 'BITCORN',
    kind: 'Project site with a 3D corn maze and a pixel farm',
    blurb: 'Run Cornelius’s 3D corn maze, find Husk, chat by the fence, and grow a pixel farm.',
    url: 'https://bitcorn.lol/maze',
    frame: false,
    links: [
      { label: 'Run the maze', href: 'https://bitcorn.lol/maze' },
      { label: 'Site', href: 'https://bitcorn.lol' },
    ],
    image: {
      src: '/img/bitcorn.webp',
      width: 800,
      height: 420,
      alt: 'BITCORN home page: “Welcome to corn country” over a pixel-art cornfield with a red barn.',
    },
  },
  {
    cmd: 'bulkos',
    aliases: ['bulk', 'bulk-os'],
    slug: 'bulk-os',
    group: 'sites',
    name: 'BULK OS + bulk games',
    kind: 'Project site, web desktop and sprite games',
    blurb:
      'A web “OS” packed with games and toys, from back when every asset was made separately and hand-edited into sprites in GIMP.',
    url: 'https://www.bulked.lol/os',
    frame: true,
    links: [
      { label: 'Open', href: 'https://www.bulked.lol/os' },
      { label: 'Site', href: 'https://www.bulked.lol' },
    ],
  },
  {
    cmd: 'sanic',
    slug: 'sanic',
    group: 'sites',
    name: '$SANIC',
    kind: 'Project site with a playable WebGL ring runner',
    blurb:
      'Run the trenches, stack rings, and go irresponsibly fast. The runner plays right on the landing page.',
    url: 'https://www.sanic.fun',
    frame: false,
    links: [{ label: 'Play', href: 'https://www.sanic.fun' }],
  },
  {
    cmd: 'hog',
    slug: 'hog',
    group: 'sites',
    name: 'HOG on Solana',
    kind: 'Project site with a 2D motorcycle sim',
    blurb: 'Rev the engine, hold the RPM, don’t stall.',
    url: 'https://www.crankmyhog.lol',
    frame: true,
    links: [{ label: 'Ride', href: 'https://www.crankmyhog.lol' }],
  },
];

// The Radbros, rendered in 3D with transparent backgrounds.
// `num` is what the terminal takes (`info 4764`). `featured` = the site mascot.
// `soon` = built for RadRun but not playable there yet; drop it once he is.
export const crew = {
  title: 'The crew',
  line: 'Radbros #652, #4764, #2564 and #723, built in 3D and playable in RadRun.',
  playIn: 'radrun',
  downloadAll: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbros-3d-all.zip', label: 'all four, one .zip', size: '81 MB' },
  members: [
    {
      num: '652',
      slug: 'radbro-652',
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
      name: 'Radbro #4764',
      line: 'Skull shades, scribble hoodie, katana at his hip.',
      download: { href: 'https://github.com/dexedrne/vyvanse.beer/releases/download/radbros-3d/radbro4764-3d-model-v3.zip', label: '3D model .zip', size: '19 MB' },
      featured: true,
      image: {
        src: '/img/radbros/radbro-4764.webp',
        width: 185,
        height: 500,
        alt: 'Radbro #4764 in 3D: violet bob, black sunglasses with skull-print lenses, a nosebleed, a white hoodie covered in blue graffiti scribbles, black jeans and sneakers, and a katana sheathed at his hip.',
      },
    },
    {
      num: '2564',
      slug: 'radbro-2564',
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
  ],
};

// The big #4764 in the hero. The render is the poster (and what no-JS visitors and crawlers
// get); `model` is the small web GLB <model-viewer> swaps in so you can drag him around.
export const mascot = {
  src: '/img/radbros/radbro-4764-hero.webp',
  width: 719,
  height: 1100,
  alt: 'Radbro #4764 in 3D, waving hello: violet bob, black sunglasses with skull-print lenses, a white hoodie covered in blue graffiti scribbles, black jeans, and a katana sheathed at his hip.',
  model: '/models/radbro4764-hero.glb',
};

// Host shown in lists and window title bars: "radrun.vyvanse.beer", "bulked.lol/os".
export function shortUrl(href) {
  const u = new URL(href);
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  return u.host.replace(/^www\./, '') + path;
}
