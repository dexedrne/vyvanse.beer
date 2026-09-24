// The tap list. One entry per project; order here is order on the page.
//
//   slug      anchor id (vyvanse.beer/#slug)
//   name      big name on the tap list
//   style     one line under the name, like a beer style
//   blurb     plain-text description
//   featured  optional, true = large layout with the image beside the text
//   image     optional { src, width, height, alt }, files live in public/img/
//   links     [{ label, href }], rendered as one split capsule, first link is the main action
//   notes     optional list of small lines under the links (trusted HTML, keep it short)

export const projects = [
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
      'Play link not loading yet? Use <a href="https://radbro-rug-run.vercel.app">radbro-rug-run.vercel.app</a> for now.',
      'Built on <a href="https://prnth.com/react-three-game/">react-three-game</a> by prnth.',
    ],
  },
  {
    slug: 'khcom',
    name: 'KH:CoM decomp',
    style: 'Game Boy Advance decompilation',
    blurb:
      'Decompilation of Kingdom Hearts: Chain of Memories for the GBA. Builds byte-identical to the original.',
    links: [{ label: 'Source', href: 'https://github.com/dexedrne/khcom' }],
  },
];
