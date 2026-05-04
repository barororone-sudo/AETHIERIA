# External Models

Put your authored `.obj` files here to replace fallback primitives at runtime.

Recognized files:
- `tree.obj`
- `rock.obj`
- `cliff.obj`
- `house.obj`
- `player.obj`

The loader supports:
- vertex positions (`v`)
- normals (`vn`)
- faces (`f` with triangles/quads)

If a file is missing, the engine uses built-in fallback geometry.
