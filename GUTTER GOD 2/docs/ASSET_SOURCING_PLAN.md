# ASSET SOURCING PLAN (LOCAL-ONLY)

## Scope

Project is local-only and non-published. We still keep a clean sourcing log to avoid integration chaos and to ensure reproducible imports.

## Preferred Sources (Free / Student / Secure)

1. GitHub Student Pack partner offers (tools/services and credits when relevant).
2. Mixamo (character rigs + animations, free for integration workflow).
3. Poly Haven (CC0 HDRI and textures).
4. Kenney (free game-ready packs).
5. Quaternius (free low-friction game assets).
6. OpenGameArt (filter by permissive licenses).
7. Freesound (license-filtered SFX and ambiences).

## Integration Rules

1. Always import to assets/external/{source}/...
2. Keep original archive or source URL in a manifest entry.
3. Convert/optimize to glTF (where needed) and keep source copy.
4. Normalize naming: role_category_variant (example: player_knight_v01).
5. Add one entry per imported asset in assets/external/ASSET_SOURCES.md:
   - source URL
   - license
   - local path
   - usage in game

## Priority Order for GUTTER GOD Phase B

1. Player character + base animation set (idle, run, jump, attack chain, dodge, glide).
2. Enemy archetypes (melee, ranged, elite).
3. Vegetation and rocks for chunk dressing.
4. Loot pickups and interactable props.
5. Spatialized combat and ambience audio layers.

## Runtime Targets

1. Prefer glTF/GLB, texture atlases, and compressed textures when possible.
2. Keep draw calls stable via instancing for repeated world props.
3. LOD strategy for environment sets before visual polish pass.
