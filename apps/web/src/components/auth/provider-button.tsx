/* eslint-disable func-style, complexity, no-nested-ternary, sort-keys, no-use-before-define, no-eq-null, eqeqeq, no-negated-condition, no-await-in-loop, no-empty-function, no-shadow, arrow-body-style, jsdoc/check-tag-names, react-compiler/react-compiler, react/no-unstable-nested-components, jsx-a11y/prefer-tag-over-role, import/consistent-type-specifier-style, unicorn/consistent-function-scoping */
import { authMutationKeys, getProviderName } from "@better-auth-ui/core";
import type { AuthView } from "@better-auth-ui/core";
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react";
import { Button } from "@callcastlecare/ui/components/button";
import { Spinner } from "@callcastlecare/ui/components/spinner";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useIsMutating } from "@tanstack/react-query";
import type { SocialProvider } from "better-auth/social-providers";
import type { ComponentProps } from "react";

import { LastUsedBadge } from "./last-login-method/last-used-badge";

export type ProviderButtonProps = {
  provider: SocialProvider;
  display?: "full" | "name" | "icon";
  view?: AuthView;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled">;

/**
 * Social provider sign-in button.
 *
 * @param provider - Provider to sign in with.
 * @param display - `"full"` (e.g. "Continue with Google"), `"name"` (just the provider name), or `"icon"` (icon only).
 */
export function ProviderButton({
  provider,
  display = "full",
  view = "signIn",
  variant = "outline",
  className,
  ...props
}: ProviderButtonProps) {
  const { authClient, baseURL, localization, redirectTo } = useAuth();

  const callbackURL = `${baseURL}${redirectTo}`;

  const { mutate: signInSocial, isPending: signInSocialPending } =
    useSignInSocial(authClient);

  const ProviderIcon = providerIcons[provider];

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all,
  });
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all,
  });
  const isPending = signInMutating + signUpMutating > 0;

  return (
    <Button
      type="button"
      variant={variant}
      disabled={isPending}
      onClick={() => signInSocial({ callbackURL, provider })}
      className={cn("relative overflow-visible", className)}
      {...props}
    >
      {signInSocialPending ? (
        <Spinner />
      ) : ProviderIcon ? (
        <ProviderIcon />
      ) : null}

      {display === "full"
        ? localization.auth.continueWith.replace(
            "{{provider}}",
            getProviderName(provider)
          )
        : display === "name"
          ? getProviderName(provider)
          : null}

      {display === "icon" && (
        <span className="sr-only">{getProviderName(provider)}</span>
      )}

      {view !== "signUp" && <LastUsedBadge method={provider} floating />}
    </Button>
  );
}
