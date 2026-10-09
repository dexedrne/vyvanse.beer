# iPhone PWA launcher plan

The owner's phase 1 brief is the scope: preserve the rainy cartridge menu, puddle duo, music and tip jar; make the launcher installable and usable on an iPhone 16 Pro with a DualSense as the primary input. Games remain in the iframe. Game changes belong to phase 2.

- [x] Add phone detection and a per-frame, destination-origin pad relay; test phone/tablet distinctions, connection changes, origin and window checks, fallback shim, and hold-to-menu.
- [x] Add manifest, existing-mark icons and iPhone startup images. Build a content-versioned shell-only worker with network refresh, offline launch, and an explicit update button that never reloads an active game.
- [x] Extend the current menu for safe areas, short landscape phones, touch hints/swipes/back and first-gesture audio.
- [x] Document the device/pad contracts and phase 2 work for every game.
- [x] Run unit tests, syntax checks, production build, portrait/landscape iPhone WebKit and desktop Chromium. Keep three final screenshots, headless muted browsers, temporary profiles in the smoke cache, ports 5960–5964, and PID cleanup.
- [x] Review the change and prepare the local commit and release handoff. No push or deployment.

Review focus: iPad must stay a tablet even with a desktop UA; a connected pad must not override a later tap until used; pad disconnect must clear held buttons; untrusted messages must not close games or forge input; an updated shell must not mix cached deployment versions or reload live play.
