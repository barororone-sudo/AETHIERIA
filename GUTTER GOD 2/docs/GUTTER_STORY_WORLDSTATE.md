# GUTTER GOD: The Gutter And The Sky Fracture

## Core Myth

The world is not a planet. It is the Gutter: a divine landfill built under an artificial sky dome. Gods, dead civilizations, failed miracles, broken stars, memories, oceans, and sins were thrown here to rot where no heaven would have to look at them.

The player begins as a survivor inside the lowest layer, believing the blue sky is natural. It is not. It is a painted containment shell.

## The Sky Fracture

At the first divine drain under Vael-Dorn, the player touches a buried engine-heart. The dome answers. A thin white wound crosses the sky, then splits into violet geometry.

Immediate changes:

- Gravity becomes unstable around divine debris fields.
- Water turns luminous because it is no longer water, but liquid memory leaking from the dome machinery.
- Burning fragments of abandoned gods fall from the sky and form new ruins.
- Hidden meshes tagged as `fractured` or `divine-debris` become active.
- Water emissive intensity increases and the sky material becomes violet-magenta.

## World State Philosophy

Every major secret physically rewrites a zone. Secrets are not lore pickups; they are world-edit switches.

Examples:

- `SKY_DOME_FIRST_CRACK`: reveals fracture ruins, changes sky and gravity scale.
- `LUMINOUS_WATER_SOURCE`: turns rivers into traversal paths and unlocks submerged memory quests.
- `FALLEN_DIVINE_ENGINE`: drops a new dungeon chunk into the world and changes local enemy ecology.

The technical support lives in `world/WorldStateManager.ts` and is designed to be driven by `gameplay/QuestEngine.ts`.
