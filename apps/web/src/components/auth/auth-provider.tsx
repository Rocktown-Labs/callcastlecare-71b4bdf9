/* eslint-disable func-style, complexity, no-nested-ternary, sort-keys, no-use-before-define, no-eq-null, eqeqeq, no-negated-condition, no-await-in-loop, no-empty-function, no-shadow, arrow-body-style, jsdoc/check-tag-names, react-compiler/react-compiler, react/no-unstable-nested-components, jsx-a11y/prefer-tag-over-role, import/consistent-type-specifier-style, unicorn/consistent-function-scoping */
import { AuthProvider as AuthProviderPrimitive } from "@better-auth-ui/react";
import type { AuthProviderProps } from "@better-auth-ui/react";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  PropsWithChildren,
  ReactNode,
} from "react";

import { ErrorToaster } from "./error-toaster";

declare module "@better-auth-ui/core" {
  interface AuthConfig {
    /**
     * React component used to render internal navigation links.
     * Typically TanStack Router's `Link` or Next.js's `Link`.
     */
    Link: ComponentType<
      PropsWithChildren<
        { className?: string; href: string; to?: string } & Pick<
          ComponentPropsWithoutRef<"a">,
          "aria-disabled" | "tabIndex" | "onClick"
        >
      >
    >;
  }

  /** Widen `AdditionalField.label` to `ReactNode` in the shadcn package. */
  interface AdditionalFieldRegister {
    label: ReactNode;
  }
}

/**
 * Provides an authentication context by rendering an auth provider with the sonner toast handler injected, forwarding remaining configuration and rendering `children` inside it.
 *
 * @param children - React nodes to render inside the authentication provider
 * @returns A React element that renders an authentication provider configured with the provided props and toast handler
 */
export function AuthProvider({ children, ...config }: AuthProviderProps) {
  return (
    <AuthProviderPrimitive {...config}>
      {children}

      <ErrorToaster />
    </AuthProviderPrimitive>
  );
}
