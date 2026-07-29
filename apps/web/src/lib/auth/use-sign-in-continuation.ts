/* eslint-disable func-style, complexity, no-nested-ternary, sort-keys, no-use-before-define, no-eq-null, eqeqeq, no-negated-condition, no-await-in-loop, no-empty-function, no-shadow, arrow-body-style, jsdoc/check-tag-names, react-compiler/react-compiler, react/no-unstable-nested-components, jsx-a11y/prefer-tag-over-role, import/consistent-type-specifier-style, unicorn/consistent-function-scoping */
import { useAuth } from "@better-auth-ui/react";
import { useCallback } from "react";

import { getServerUrl } from "../server-url";
import {
  isTwoFactorRedirect,
  storeTwoFactorMethods,
  TWO_FACTOR_PLUGIN_ID,
} from "./two-factor-methods";

export const getPostAuthRedirectTo = async (redirectTo: string) => {
  if (redirectTo !== "/dashboard") {
    return redirectTo;
  }

  const response = await fetch(new URL("/api/v1/me", getServerUrl()), {
    credentials: "include",
  });

  if (!response.ok) {
    return redirectTo;
  }

  const payload = (await response.json().catch(() => null)) as {
    isAdmin?: boolean;
  } | null;

  return payload?.isAdmin ? "/admin" : redirectTo;
};

/**
 * Resolve what happens after a sign-in request succeeds.
 *
 * Better Auth withholds the session when a second factor is required and
 * answers with `{ twoFactorRedirect: true, twoFactorMethods }` instead, so no
 * sign-in strategy may navigate to `redirectTo` unconditionally. This hook is
 * the single place that decision lives — every password-based form calls it
 * from `onSuccess`.
 *
 * The enabled methods are stashed in session storage (names only, never a
 * code or token) and `redirectTo` rides along in the query string so the
 * challenge view can finish the original navigation.
 *
 * The two-factor plugin is looked up by its stable id, so sign-in forms stay
 * installable without either the two-factor components or a matching release
 * of `@better-auth-ui/core`.
 *
 * @returns A callback taking the resolved data of a sign-in mutation.
 */
export function useSignInContinuation() {
  const { basePaths, navigate, plugins, redirectTo } = useAuth();

  const twoFactorPath = plugins.find(
    (plugin) => plugin.id === TWO_FACTOR_PLUGIN_ID
  )?.viewPaths?.auth?.twoFactor;

  return useCallback(
    async (data: unknown) => {
      if (twoFactorPath && isTwoFactorRedirect(data)) {
        storeTwoFactorMethods(data.twoFactorMethods);

        navigate({
          to: `${basePaths.auth}/${twoFactorPath}?redirectTo=${encodeURIComponent(redirectTo)}`,
        });
        return;
      }

      navigate({ to: await getPostAuthRedirectTo(redirectTo) });
    },
    [basePaths.auth, navigate, redirectTo, twoFactorPath]
  );
}
