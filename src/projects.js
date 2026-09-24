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
//   group     'games' or 'older' (see `groups`)
//   name      display name
//   kind      one line saying what it is
//   blurb     plain-text description
//   url       what `open` launches (also the card's main link)
//   frame     true if the site allows being shown in an iframe, so `open` uses an in-page
//             window. false = it sends X-Frame-Options / frame-ancestors, so `open` uses a new
//             tab. Check with: curl -sI <url> | grep -iE 'x-frame-options|frame-ancestors'
//   links     [{ label, href }]; the first one is the main action and should match `url`
//   image     optional { src, width, height, alt } in public/img/ (800px wide, ~1.9:1)
//   credit    optional { before, label, href, after } rendered as one line
//   note      optional plain-text line

export const site = {
  name: 'vyvanse.beer',
  handle: 'dexedrne',
  tagline: 'Browser games, meme sites and small worlds by dexedrne.',
  links: [
    { cmd: 'github', label: 'GitHub', href: 'https://github.com/dexedrne' },
    { cmd: 'x', label: 'X', href: 'https://x.com/dexedrne' },
  ],
};

export const groups = [
  { id: 'games', title: 'Games', line: 'Games and worlds that run in a browser tab.' },
  { id: 'older', title: 'Older things', line: 'Earlier sites and toys, still online.' },
];

export const projects = [
  {
    cmd: 'rugrun',
    aliases: ['rug-run'],
    slug: 'rug-run',
    group: 'games',
    name: 'Rug Run',
    kind: 'Radbro rooftop chase, free-swing 3D browser game',
    blurb:
      'He swiped your bag. You get 90 seconds to swing across the rooftops and take it back. Runs in the browser, nothing to install.',
    url: 'https://rugrun.vyvanse.beer',
    frame: true,
    links: [
      { label: 'Play', href: 'https://rugrun.vyvanse.beer' },
      { label: 'Source', href: 'https://github.com/dexedrne/rug-run' },
    ],
    image: {
      src: '/img/rug-run.jpg',
      width: 1200,
      height: 630,
      alt: 'Rug Run: a Radbro swings on a rope between city rooftops, chasing the thief who took the bag.',
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
    kind: 'Original multiplayer browser world, open beta',
    blurb:
      'Create an account, train skills, take on quests and explore a living fantasy world with other players.',
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
    cmd: 'robinscape',
    slug: 'robinscape',
    group: 'games',
    name: 'Robinscape',
    kind: 'Dark forest castle roguelite',
    blurb:
      'Solo castle runs from a shared town. Point-and-click combat, nine boons, run loot, and a town worth returning to. Free-play beta in your browser.',
    url: 'https://robinscape.quest/play',
    frame: false,
    links: [
      { label: 'Play', href: 'https://robinscape.quest/play' },
      { label: 'Site', href: 'https://robinscape.quest' },
    ],
    image: {
      src: '/img/robinscape.webp',
      width: 800,
      height: 420,
      alt: 'Robinscape landing page: the title in pale serif type beside a pixel-art swordsman in a green cloak.',
    },
    note: 'Best with a mouse and keyboard on desktop.',
  },
  {
    cmd: 'bitcorn',
    slug: 'bitcorn',
    group: 'games',
    name: 'BITCORN',
    kind: 'A 3D corn maze and a pixel farm',
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
    group: 'older',
    name: 'BULK OS',
    kind: 'An old web desktop full of early games',
    blurb:
      'The early stuff: a web “OS” packed with old games and toys, from back when every asset was made separately and hand-edited into sprites in GIMP.',
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
    group: 'older',
    name: '$SANIC',
    kind: 'Playable WebGL ring runner',
    blurb:
      'Run the trenches, stack rings, and go irresponsibly fast. The runner plays right on the landing page.',
    url: 'https://www.sanic.fun',
    frame: false,
    links: [{ label: 'Play', href: 'https://www.sanic.fun' }],
  },
  {
    cmd: 'hog',
    slug: 'hog',
    group: 'older',
    name: 'HOG on Solana',
    kind: 'A 2D motorcycle sim on a meme site',
    blurb: 'Rev the engine, hold the RPM, don’t stall.',
    url: 'https://www.crankmyhog.lol',
    frame: true,
    links: [{ label: 'Ride', href: 'https://www.crankmyhog.lol' }],
  },
];

// The Radbros, rendered in 3D with transparent backgrounds.
// `num` is what the terminal takes (`info 4764`). `featured` = the site mascot.
// `soon` = built for Rug Run but not playable there yet; drop it once he is.
export const crew = {
  title: 'The crew',
  line: 'Radbros #652, #4764, #2564 and #723, built in 3D and playable in Rug Run.',
  playIn: 'rugrun',
  members: [
    {
      num: '652',
      slug: 'radbro-652',
      name: 'Radbro #652',
      line: 'Brown mop, big blue eyes, the Nobody sweatshirt.',
      image: {
        src: '/img/radbros/radbro-652.webp',
        width: 280,
        height: 500,
        alt: 'Radbro #652 in 3D: shaggy brown hair, big blue anime eyes, a black Nobody sweatshirt and brown trousers, one fist raised in a cheer.',
      },
    },
    {
      num: '4764',
      slug: 'radbro-4764',
      name: 'Radbro #4764',
      line: 'Skull shades, scribble hoodie, katana on his back.',
      featured: true,
      image: {
        src: '/img/radbros/radbro-4764.webp',
        width: 263,
        height: 500,
        alt: 'Radbro #4764 in 3D: bright blue hair, black sunglasses with skull lenses, a white hoodie covered in blue scribbles and a katana strapped across his back, mid-stride.',
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

// The big #4764 in the hero.
export const mascot = {
  src: '/img/radbros/radbro-4764-hero.webp',
  width: 719,
  height: 1100,
  alt: 'Radbro #4764 in 3D, waving hello: bright blue hair, black sunglasses with skull lenses, a white hoodie covered in blue scribbles, black trousers, and a katana strapped across his back.',
};

// Host shown in lists and window title bars: "rugrun.vyvanse.beer", "bulked.lol/os".
export function shortUrl(href) {
  const u = new URL(href);
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  return u.host.replace(/^www\./, '') + path;
}
