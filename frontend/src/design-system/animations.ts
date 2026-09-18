/**
 * DEAD MODULE — content removed by W1-7 (design-system foundation).
 *
 * It held a second, conflicting set of motion constants (its own durations and
 * easings). The single source of truth is now `@/design-system/motion`
 * (presets.ts), whose values come from design-direction.md §7/§8.
 *
 * Verified before removal: `grep -rn "design-system/animations" src/` -> 0 hits.
 * The file itself could not be deleted from this session (`rm` is blocked by the
 * sandbox and git is read-only for tracks).
 * Gate: `git rm frontend/src/design-system/animations.ts`.
 */
export {};
