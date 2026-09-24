// The menu. Sections render in this order, and projects render in order within a section.
//
// Section fields:
//   id        anchor id (vyvanse.beer/#id), also used by the jump menu in the head
//   title     section heading
//   kicker    one line under the heading
//   kind      'taps'   = full cards, `featured` ones get the big image layout
//             'bottles' = compact grid of small cards, the whole card is one link
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
    id: 'bottle-shop',
    title: 'Bottle shop',
    kicker: 'Coin and meme sites. Small pours, strong opinions.',
    kind: 'bottles',
    items: [
      {
        slug: 'hog',
        name: 'HOG on Solana',
        line: 'A 2D motorcycle sim: rev the engine, hold the RPM, don’t stall.',
        href: 'https://www.crankmyhog.lol',
        image: {
          src: '/img/hog.webp',
          width: 800,
          height: 500,
          alt: 'HOG site: a smiling bearded figure presenting a motorcycle, over the words “Your hog, king”.',
        },
      },
      {
        slug: 'dood',
        name: 'Dood',
        line: 'Dood on Solana. A pfp, a cloud, and two very small wings.',
        href: 'https://doodpfp.lol',
        image: {
          src: '/img/dood.webp',
          width: 800,
          height: 500,
          alt: 'Dood site: a cartoon dood with tiny angel wings sitting on a cloud above the yellow “dood” logo.',
        },
      },
      {
        slug: 'cucked-peter',
        name: 'Cucked Peter',
        line: 'Launch page for $CP on Solana, with a webgame in development.',
        href: 'https://cuckedpeter.vercel.app',
        image: {
          src: '/img/cuckedpeter.webp',
          width: 800,
          height: 500,
          alt: 'Cucked Peter site: a gold $CP title on a dark, moody backdrop.',
        },
      },
      {
        slug: 'chudbob',
        name: 'CHUDBOB',
        line: 'Chudjak SpongeBob on Solana. Tap to cluck, for the culture.',
        href: 'https://chudbob-phi.vercel.app',
        image: {
          src: '/img/chudbob.webp',
          width: 800,
          height: 500,
          alt: 'CHUDBOB site: a chudjak-faced SpongeBob glowing under a cluck counter.',
        },
      },
    ],
  },
  {
    id: 'cellar',
    title: 'From the cellar',
    kicker: 'Older pours and code, aged slowly.',
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
        slug: 'khcom',
        name: 'KH:CoM decomp',
        style: 'Game Boy Advance decompilation',
        blurb:
          'Decompilation of Kingdom Hearts: Chain of Memories for the GBA. Builds byte-identical to the original.',
        links: [{ label: 'Source', href: 'https://github.com/dexedrne/khcom' }],
      },
    ],
  },
];
