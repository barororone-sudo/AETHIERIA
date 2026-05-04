# Local Performance Profile

This machine profile is for tuning GUTTER GOD performance budgets. Personal device and product IDs are intentionally not stored.

## Target Hardware

- CPU: 12th Gen Intel Core i7-1255U, 1.70 GHz base
- RAM: 16 GB installed, 15.7 GB usable
- System: 64-bit Windows, x64 CPU
- Touch/stylus: unavailable on this display

## Engine Budget Notes

- Prefer WebGL2/WebGPU paths that avoid readbacks and per-frame allocations.
- Keep static world content on thin instances or frozen meshes.
- Use shared materials for terrain, trees, rocks, ruins, and grass families.
- Keep post-processing lightweight: color grading, restrained outline, no heavy full-screen stacks by default.
- Favor chunk-based streaming and adaptive density over large always-visible scenery.
- Treat this laptop profile as the baseline for "zero lag" browser playability.
