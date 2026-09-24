// The menu. Sections render in this order, and projects render in order within a section.
//
// Section fields:
//   id        anchor id (vyvanse.beer/#id), also used by the jump menu in the head
//   title     section heading
//   kicker    one line under the heading
//   kind      'taps'   = full cards, `featured` ones get the big image layout
//             'bottles' = compact grid of small cards, the whole card is one link
//             'crew'    = a row of Radbro figures
//   items     the projects
//
// Tap fields ('taps' sections):
//   slug      anchor id (vyvanse.beer/#slug)
//   name      big name on the tap list
//   style     one line under the name, like a beer style
//   blurb     plain-text description
//   featured  optional, true = large layout with the image beside the text
//   image     optional { src, width, height, alt }, files live in public/img/
//   links     [{ label, href }], rendered as one split capsule, first link is the main action
//   notes     optional list of small lines under the links (trusted HTML, keep it short,
//             give external links rel="noopener")
//
// Bottle fields ('bottles' sections):
//   slug, name, line (one short plain-text line), href, image { src, width, height, alt }
//
// Crew fields ('crew' section, Radbro renders with transparent backgrounds):
//   slug, name, line, image { src, width, height, alt }; the section takes an optional
//   cta { label, href } rendered as one capsule under the row
//
// Card images are 800px wide webp: 800x420 for featured taps, 800x500 for bottles.

export const sections = [
  {
    id: 'on-tap',
    title: 'On tap',
    kicker: 'Games and worlds that pour straight into a browser tab.',
    kind: 'taps',
    items: [
      {
        slug: 'rug-run',
        name: 'Rug Run',
        style: 'Radbro rooftop chase, free-swing 3D browser game',
        blurb:
          'He swiped your bag. You get 90 seconds to swing across the rooftops and take it back. Runs in the browser, nothing to install.',
        featured: true,
        image: {
          src: '/img/rug-run.jpg',
          width: 1200,
          height: 630,
          alt: 'Rug Run: a Radbro swings on a rope between city rooftops, chasing the thief who took the bag.',
        },
        links: [
          { label: 'Play', href: 'https://rugrun.vyvanse.beer' },
          { label: 'Source', href: 'https://github.com/dexedrne/rug-run' },
        ],
        notes: [
          'Built on <a href="https://prnth.com/react-three-game/" rel="noopener">react-three-game</a> by prnth.',
        ],
      },
      {
        slug: 'solscape',
        name: 'Solscape',
        style: 'Original multiplayer browser world, open beta',
        blurb:
          'Create an account, train skills, take on quests and explore a living fantasy world with other players.',
        featured: true,
        image: {
          src: '/img/solscape.webp',
          width: 800,
          height: 420,
          alt: 'Solscape login screen: the glowing Solscape logo over a harbor town at dusk, with Create account and Existing User buttons.',
        },
        links: [
          { label: 'Play', href: 'https://play.solscape.fun' },
          { label: 'Site', href: 'https://www.solscape.fun' },
        ],
      },
      {
        slug: 'robinscape',
        name: 'Robinscape',
        style: 'Dark forest castle roguelite',
        blurb:
          'Solo castle runs from a shared town. Point-and-click combat, nine boons, run loot, and a town worth returning to. Free-play beta in your browser.',
        featured: true,
        image: {
          src: '/img/robinscape.webp',
          width: 800,
          height: 420,
          alt: 'Robinscape landing page: the title in pale serif type beside a pixel-art swordsman in a green cloak.',
        },
        links: [
          { label: 'Play', href: 'https://robinscape.quest/play' },
          { label: 'Site', href: 'https://robinscape.quest' },
        ],
        notes: ['Best with a mouse and keyboard on desktop.'],
      },
      {
        slug: 'bitcorn',
        name: 'BITCORN',
        style: 'Website: a 3D corn maze and a pixel farm',
        blurb:
          'Run Cornelius’s 3D corn maze, find Husk, chat by the fence, and grow a pixel farm.',
        featured: true,
        image: {
          src: '/img/bitcorn.webp',
          width: 800,
          height: 420,
          alt: 'BITCORN home page: “Welcome to corn country” over a pixel-art cornfield with a red barn.',
        },
        links: [
          { label: 'Run the maze', href: 'https://bitcorn.lol/maze' },
          { label: 'Site', href: 'https://bitcorn.lol' },
        ],
      },
    ],
  },
  {
    id: 'crew',
    title: 'The crew',
    kicker: 'Radbros #652, #4764 and #2564, built in 3D and playable in Rug Run.',
    kind: 'crew',
    items: [
      {
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
        slug: 'radbro-4764',
        name: 'Radbro #4764',
        line: 'Skull shades, scribble hoodie, katana on his back.',
        image: {
          src: '/img/radbros/radbro-4764.webp',
          width: 263,
          height: 500,
          alt: 'Radbro #4764 in 3D: bright blue hair, black sunglasses with skull lenses, a white hoodie covered in blue scribbles and a katana strapped across his back, mid-stride.',
        },
      },
      {
        slug: 'radbro-2564',
        name: 'Radbro #2564',
        line: 'The ghost. Foil hat, aviators, RAD RESPONSE vest.',
        image: {
          src: '/img/radbros/radbro-2564.webp',
          width: 265,
          height: 500,
          alt: 'Radbro #2564, the ghost, in 3D: white face, pale lavender hair under a crumpled tin-foil hat and white kufi, black aviators, and a RAD RESPONSE plate carrier, one arm held out.',
        },
      },
    ],
    cta: { label: 'Play them in Rug Run', href: 'https://rugrun.vyvanse.beer' },
  },
  {
    id: 'cellar',
    title: 'From the cellar',
    kicker: 'Older pours, aged slowly.',
    kind: 'taps',
    items: [
      {
        slug: 'bulk-os',
        name: 'BULK OS',
        style: 'An old web desktop full of early games',
        blurb:
          'The early stuff: a web “OS” packed with old games and toys, from back when every asset was made separately and hand-edited into sprites in GIMP.',
        links: [
          { label: 'Open', href: 'https://www.bulked.lol/os' },
          { label: 'Site', href: 'https://www.bulked.lol' },
        ],
      },
      {
        slug: 'sanic',
        name: '$SANIC',
        style: 'Playable WebGL ring runner',
        blurb:
          'Run the trenches, stack rings, and go irresponsibly fast. The runner plays right on the landing page.',
        links: [{ label: 'Play', href: 'https://www.sanic.fun' }],
      },
      {
        slug: 'hog',
        name: 'HOG on Solana',
        style: 'A 2D motorcycle sim on a meme site',
        blurb: 'Rev the engine, hold the RPM, don’t stall.',
        links: [{ label: 'Ride', href: 'https://www.crankmyhog.lol' }],
      },
    ],
  },
];
