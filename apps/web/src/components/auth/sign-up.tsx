/* eslint-disable func-style, complexity, no-nested-ternary, sort-keys, no-use-before-define, no-eq-null, eqeqeq, no-negated-condition, no-await-in-loop, no-empty-function, no-shadow, arrow-body-style, jsdoc/check-tag-names, react-compiler/react-compiler, react/no-unstable-nested-components, jsx-a11y/prefer-tag-over-role, import/consistent-type-specifier-style, unicorn/consistent-function-scoping */
import {
  authMutationKeys,
  parseAdditionalFieldValue,
} from "@better-auth-ui/core";
import {
  AuthPrompts,
  useAuth,
  useFetchOptions,
  useSignUpEmail,
} from "@better-auth-ui/react";
import { Button } from "@callcastlecare/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@callcastlecare/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@callcastlecare/ui/components/field";
import { Input } from "@callcastlecare/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@callcastlecare/ui/components/input-group";
import { Spinner } from "@callcastlecare/ui/components/spinner";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useIsMutating } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { toast } from "sonner";

import { getPostAuthRedirectTo } from "@/lib/auth/use-sign-in-continuation";

import { AdditionalField } from "./additional-field";
import { ProviderButtons } from "./provider-buttons";
import type { SocialLayout } from "./provider-buttons";

export interface SignUpProps {
  className?: string;
  socialLayout?: SocialLayout;
  socialPosition?: "top" | "bottom";
  /**
   * Runs instead of the post-sign-up redirect, but only when the sign-up
   * created an immediately usable session. Email verification still takes
   * priority, and social sign-ups are unaffected.
   */
  onSignUpSuccess?: () => void;
}

/**
 * Renders a sign-up form with name, email, and password fields, optional social provider buttons, and submission handling.
 *
 * Submits credentials to the configured auth client and handles the response:
 * - If email verification is required, shows a notification and navigates to sign-in
 * - On success, refreshes the session and navigates to the configured redirect path
 * - On failure, displays error toasts
 * - Manages a pending state while the request is in-flight
 *
 * @param className - Additional CSS classes applied to the outer container
 * @param socialLayout - Social layout to apply to the component
 * @param socialPosition - Social position to apply to the component
 * @param onSignUpSuccess - Replaces the post-sign-up redirect when the new account is immediately usable
 * @returns The sign-up form React element.
 */
export function SignUp({
  className,
  socialLayout,
  socialPosition = "bottom",
  onSignUpSuccess,
}: SignUpProps) {
  const {
    additionalFields,
    authClient,
    basePaths,
    emailAndPassword,
    localization,
    plugins,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link,
  } = useAuth();

  const { fetchOptions, resetFetchOptions } = useFetchOptions();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mutate: signUpEmail, isPending: signUpEmailPending } = useSignUpEmail(
    authClient,
    {
      onError: () => {
        setPassword("");
        setConfirmPassword("");
        resetFetchOptions();
      },
      onSuccess: async (_data, { email }) => {
        if (emailAndPassword?.requireEmailVerification) {
          sessionStorage.setItem("better-auth-ui.verify-email", email);
          navigate({
            to: `${basePaths.auth}/${viewPaths.auth.verifyEmail}`,
          });
        } else if (onSignUpSuccess) {
          onSignUpSuccess();
        } else {
          navigate({ to: await getPostAuthRedirectTo(redirectTo) });
        }
      },
    }
  );

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all,
  });
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all,
  });
  const isPending = signInMutating + signUpMutating > 0;

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent
  )?.captchaComponent;

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    // `emailAndPassword.name === false` hides the name field and submits "".
    const name = (formData.get("name") as string | null) ?? "";
    const email = formData.get("email") as string;

    if (emailAndPassword?.confirmPassword && password !== confirmPassword) {
      toast.error(localization.auth.passwordsDoNotMatch);
      setPassword("");
      setConfirmPassword("");
      return;
    }

    const additionalFieldValues: Record<string, unknown> = {};

    for (const field of additionalFields ?? []) {
      if (!field.signUp || field.readOnly) {
        continue;
      }
      const value = parseAdditionalFieldValue(
        field,
        formData.get(field.name) as string | null
      );

      if (field.validate) {
        try {
          await field.validate(value);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error));
          return;
        }
      }

      if (value !== undefined) {
        additionalFieldValues[field.name] = value;
      }
    }

    signUpEmail({
      name,
      email,
      password,
      ...additionalFieldValues,
      fetchOptions,
    });
  };

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0;

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <AuthPrompts view="signUp" />
      <CardHeader className="px-5 pt-5 sm:px-6">
        <CardTitle className="text-xl font-semibold text-white">
          {localization.auth.signUp}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-6">
          {socialPosition === "top" && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} view="signUp" />
              )}

              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-transparent text-xs flex items-center text-white/40">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {emailAndPassword?.enabled && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {emailAndPassword.name !== false && (
                  <Field data-invalid={!!fieldErrors.name}>
                    <FieldLabel htmlFor="name">
                      {localization.auth.name}
                    </FieldLabel>

                    <Input
                      className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/36"
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder={localization.auth.namePlaceholder}
                      required
                      disabled={isPending}
                      onChange={() => {
                        setFieldErrors((prev) => ({
                          ...prev,
                          name: undefined,
                        }));
                      }}
                      onInvalid={(e) => {
                        e.preventDefault();

                        setFieldErrors((prev) => ({
                          ...prev,
                          name: localization.auth.fieldRequired,
                        }));
                      }}
                      aria-invalid={!!fieldErrors.name}
                    />

                    <FieldError>{fieldErrors.name}</FieldError>
                  </Field>
                )}

                <Field data-invalid={!!fieldErrors.email}>
                  <FieldLabel htmlFor="email">
                    {localization.auth.email}
                  </FieldLabel>

                  <Input
                    className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/36"
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={localization.auth.emailPlaceholder}
                    required
                    disabled={isPending}
                    onChange={() => {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }}
                    onInvalid={(e) => {
                      e.preventDefault();
                      const el = e.target as HTMLInputElement;
                      const msg = el.validity.valueMissing
                        ? localization.auth.fieldRequired
                        : localization.auth.invalidEmail;

                      setFieldErrors((prev) => ({
                        ...prev,
                        email: msg,
                      }));
                    }}
                    aria-invalid={!!fieldErrors.email}
                  />

                  <FieldError>{fieldErrors.email}</FieldError>
                </Field>

                {additionalFields?.map(
                  (field) =>
                    field.signUp === "above" && (
                      <AdditionalField
                        key={field.name}
                        name={field.name}
                        field={field}
                        isPending={isPending}
                        optionalLabel={localization.auth.optional}
                      />
                    )
                )}

                <Field data-invalid={!!fieldErrors.password}>
                  <FieldLabel htmlFor="password">
                    {localization.auth.password}
                  </FieldLabel>

                  <InputGroup className="h-11 rounded-full border-white/10 bg-white/[0.04]">
                    <InputGroupInput
                      className="px-4 text-sm text-white placeholder:text-white/36"
                      id="password"
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }}
                      placeholder={localization.auth.passwordPlaceholder}
                      required
                      minLength={emailAndPassword?.minPasswordLength}
                      maxLength={emailAndPassword?.maxPasswordLength}
                      disabled={isPending}
                      onInvalid={(e) => {
                        e.preventDefault();
                        const el = e.target as HTMLInputElement;
                        const min = emailAndPassword?.minPasswordLength;
                        const max = emailAndPassword?.maxPasswordLength;
                        const msg = el.validity.valueMissing
                          ? localization.auth.fieldRequired
                          : el.validity.tooShort
                            ? localization.auth.tooShort.replace(
                                "{{min}}",
                                String(min)
                              )
                            : localization.auth.tooLong.replace(
                                "{{max}}",
                                String(max)
                              );

                        setFieldErrors((prev) => ({
                          ...prev,
                          password: msg,
                        }));
                      }}
                      aria-invalid={!!fieldErrors.password}
                    />

                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        className="rounded-full text-white/55 hover:bg-white/10 hover:text-white"
                        size="icon-xs"
                        aria-label={
                          isPasswordVisible
                            ? localization.auth.hidePassword
                            : localization.auth.showPassword
                        }
                        title={
                          isPasswordVisible
                            ? localization.auth.hidePassword
                            : localization.auth.showPassword
                        }
                        onClick={() => {
                          setIsPasswordVisible((visible) => !visible);
                        }}
                      >
                        {isPasswordVisible ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>

                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>

                {emailAndPassword?.confirmPassword && (
                  <Field data-invalid={!!fieldErrors.confirmPassword}>
                    <FieldLabel htmlFor="confirmPassword">
                      {localization.auth.confirmPassword}
                    </FieldLabel>

                    <InputGroup className="h-11 rounded-full border-white/10 bg-white/[0.04]">
                      <InputGroupInput
                        className="px-4 text-sm text-white placeholder:text-white/36"
                        id="confirmPassword"
                        name="confirmPassword"
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);

                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                          }));
                        }}
                        placeholder={
                          localization.auth.confirmPasswordPlaceholder
                        }
                        required
                        minLength={emailAndPassword?.minPasswordLength}
                        maxLength={emailAndPassword?.maxPasswordLength}
                        disabled={isPending}
                        onInvalid={(e) => {
                          e.preventDefault();
                          const el = e.target as HTMLInputElement;
                          const min = emailAndPassword?.minPasswordLength;
                          const max = emailAndPassword?.maxPasswordLength;
                          const msg = el.validity.valueMissing
                            ? localization.auth.fieldRequired
                            : el.validity.tooShort
                              ? localization.auth.tooShort.replace(
                                  "{{min}}",
                                  String(min)
                                )
                              : localization.auth.tooLong.replace(
                                  "{{max}}",
                                  String(max)
                                );

                          setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: msg,
                          }));
                        }}
                        aria-invalid={!!fieldErrors.confirmPassword}
                      />

                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          className="rounded-full text-white/55 hover:bg-white/10 hover:text-white"
                          size="icon-xs"
                          aria-label={
                            isConfirmPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          title={
                            isConfirmPasswordVisible
                              ? localization.auth.hidePassword
                              : localization.auth.showPassword
                          }
                          onClick={() =>
                            setIsConfirmPasswordVisible((visible) => !visible)
                          }
                        >
                          {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>

                    <FieldError>{fieldErrors.confirmPassword}</FieldError>
                  </Field>
                )}

                {additionalFields?.map(
                  (field) =>
                    field.signUp &&
                    field.signUp !== "above" && (
                      <AdditionalField
                        key={field.name}
                        name={field.name}
                        field={field}
                        isPending={isPending}
                        optionalLabel={localization.auth.optional}
                      />
                    )
                )}

                {Captcha && (
                  <div className="flex justify-center">{Captcha}</div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    className="h-11 rounded-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200"
                    type="submit"
                    disabled={isPending}
                  >
                    {signUpEmailPending && <Spinner />}

                    {localization.auth.signUp}
                  </Button>

                  {plugins.flatMap((plugin) =>
                    (plugin.authButtons ?? []).map((AuthButton, index) => (
                      <AuthButton
                        key={`${plugin.id}-${index.toString()}`}
                        view="signUp"
                      />
                    ))
                  )}
                </div>
              </FieldGroup>
            </form>
          )}

          {socialPosition === "bottom" && (
            <>
              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-transparent text-xs flex items-center text-white/40">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} view="signUp" />
              )}
            </>
          )}
        </div>

        {emailAndPassword?.enabled && (
          <div className="flex flex-col gap-3 items-center w-full mt-4">
            <FieldDescription className="text-center">
              {localization.auth.alreadyHaveAnAccount}{" "}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
                className="font-medium text-lime-200 underline underline-offset-4 hover:text-lime-100"
              >
                {localization.auth.signIn}
              </Link>
            </FieldDescription>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
