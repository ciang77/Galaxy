# Galaxy artwork

The user's character reference is preserved in `character-reference.png`.
The character keeps the reference's silver hair, teal accents, black clothing
and illustration style. Eight poses are packed in a 4-by-2 transparent atlas:
idle, thinking, working, complete, alert, sleeping, waking, wave.

## Sources and reproduction

- `galaxy-character-sheet.png`: original generated atlas, retained for provenance.
- `galaxy-character-sheet-clean-v2.png`: current atlas, cleaned using the built-in
  image generation/editing tool on 2026-10-21. No external API/CLI was used.
- `galaxy-icon-source.png`: generated portrait used for the separate application icon.
- `sprites/`: normalized 512-by-512 runtime poses.
- `../svg/galaxy-*.png` and `../svg/galaxy-*.svg`: runtime assets generated from the atlas.

Run `npm run assets:galaxy` to slice the current atlas, generate the multi-size
Windows icon and regenerate the animated SVG wrappers. Rebuild the installer
after changing assets. The historical generated atlas/icon prompts were not
saved verbatim; they should not be reconstructed and presented as exact records.

## Recorded cleanup prompt

Edit target: the attached existing Galaxy character sprite atlas. Perform ONLY
a professional alpha-edge cleanup and matte decontamination. Preserve the exact
eight poses, same character identity, original detailed anime illustration
painting style, silver-white long flowing hair with teal strands, black/teal
clothing, faces, hands, shoes, pose order and 4-column x 2-row atlas layout.
Preserve original framing and placement, keep all eight complete figures and
clear gaps. Remove ALL stray white/gray matte fragments, magenta/green/red chroma
speckles, detached background pixels and rough halos around each silhouette.
These are cutout defects, not part of the art. Retain intentional teal UI panels,
stars, sleep symbol, heart, fine hair and ribbons with clean natural alpha edges.
The background and all gaps must be genuinely fully transparent, with no white
patch, black fill, checkerboard, glow, shadows, text or grid. Do not redesign or
chibify, do not add a white outline. Aim for a 1774x887 canvas if possible,
keeping existing atlas geometry exactly. This is a cleanup of an existing game
asset, not a new character design.

## First-version limits

Pause snapshot, 2026-10-22: `galaxy-character-sheet-v3-draft.png` is an
unaccepted experimental redraw made with the built-in image tool. It still
contains visible matte/chroma artifacts and is NOT used by the runtime.
Its exact generation prompt is saved in `v3-draft-prompt.txt`.

The cleanup reduces detached matte debris. Fine hair edges still have some
light fringe and isolated color noise; the art is not a perfect manual cutout.
Animations use pose switching and whole-character breathing, sway and bounce,
not articulated limbs or Live2D. The atlas is resolution-limited and some
second-row extreme poses are tightly framed. These are visual refinement items,
separate from application identity and packaging checks.
