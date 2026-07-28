/* eslint-disable func-style, complexity, no-nested-ternary, sort-keys, no-use-before-define, no-eq-null, eqeqeq, no-negated-condition, no-await-in-loop, no-empty-function, no-shadow, arrow-body-style, jsdoc/check-tag-names, react-compiler/react-compiler, react/no-unstable-nested-components, jsx-a11y/prefer-tag-over-role, import/consistent-type-specifier-style, unicorn/consistent-function-scoping */
import { useSyncExternalStore } from "react";

/**
 * Returns `true` once the component is mounted on the client (hydrated) and
 * `false` while rendering on the server, so client-only reads (e.g.
 * `sessionStorage`) stay safe during SSR.
 *
 * @returns Whether the component has hydrated on the client.
 */
export function useIsHydrated() {
  const subscribe = () => () => {};
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
