import { Button } from "@callcastlecare/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@callcastlecare/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@callcastlecare/ui/components/field";
import { Input } from "@callcastlecare/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@callcastlecare/ui/components/input-otp";
import { Spinner } from "@callcastlecare/ui/components/spinner";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "@/lib/auth/email-otp";

interface ResetPasswordOtpProps {
  className?: string;
  email?: string;
}

const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

export const ResetPasswordOtp = ({
  className,
  email: initialEmail = "",
}: ResetPasswordOtpProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasCode, setHasCode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sendCode = async () => {
    setFormError(null);
    setIsSending(true);

    try {
      await requestPasswordResetOtp({ email });
      setHasCode(true);
      toast.success("Reset code sent. Check your email.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not send the code."
      );
    } finally {
      setIsSending(false);
    }
  };

  const resetPassword = async () => {
    setFormError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsResetting(true);

    try {
      await resetPasswordWithOtp({ email, otp, password });
      toast.success("Password reset. You can sign in now.");
      await navigate({ to: "/sign-in" });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The password could not be reset."
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader className="px-5 pt-5 sm:px-6">
        <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-lime-300/20 bg-lime-300/10 text-lime-200">
          <KeyRound aria-hidden="true" className="size-5" />
        </div>
        <CardTitle className="text-xl font-semibold text-white">
          Reset with a code
        </CardTitle>
        <CardDescription className="text-white/60">
          We will email a six-digit code so you can set a fresh password.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 sm:px-6">
        <FieldGroup>
          <Field data-invalid={!!formError && !hasCode}>
            <FieldLabel htmlFor="reset-otp-email">Email</FieldLabel>
            <Input
              autoComplete="email"
              className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/36"
              disabled={isSending || isResetting || hasCode}
              id="reset-otp-email"
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError(null);
              }}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </Field>

          {hasCode && (
            <>
              <Field data-invalid={!!formError}>
                <FieldLabel>One-time code</FieldLabel>
                <InputOTP
                  containerClassName="justify-center"
                  disabled={isResetting}
                  maxLength={OTP_LENGTH}
                  onChange={(value) => {
                    setOtp(value);
                    setFormError(null);
                  }}
                  value={otp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot aria-invalid={!!formError} index={0} />
                    <InputOTPSlot aria-invalid={!!formError} index={1} />
                    <InputOTPSlot aria-invalid={!!formError} index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-white/35 [&_svg]:size-4" />
                  <InputOTPGroup>
                    <InputOTPSlot aria-invalid={!!formError} index={3} />
                    <InputOTPSlot aria-invalid={!!formError} index={4} />
                    <InputOTPSlot aria-invalid={!!formError} index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </Field>

              <Field>
                <FieldLabel htmlFor="reset-otp-password">
                  New password
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/36"
                  id="reset-otp-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="At least 8 characters"
                  type="password"
                  value={password}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="reset-otp-confirm-password">
                  Confirm password
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/36"
                  id="reset-otp-confirm-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="Repeat your new password"
                  type="password"
                  value={confirmPassword}
                />
              </Field>
            </>
          )}

          {formError && <FieldError>{formError}</FieldError>}

          {hasCode ? (
            <Button
              className="h-11 rounded-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200"
              disabled={isResetting || otp.length !== OTP_LENGTH}
              onClick={() => {
                void resetPassword();
              }}
              type="button"
            >
              {isResetting && <Spinner />}
              Reset password
            </Button>
          ) : (
            <Button
              className="h-11 rounded-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200"
              disabled={isSending || email.length === 0}
              onClick={() => {
                void sendCode();
              }}
              type="button"
            >
              {isSending && <Spinner />}
              Email me a reset code
            </Button>
          )}

          {hasCode && (
            <Button
              className="h-10 rounded-full text-white/75 hover:bg-white/10 hover:text-white"
              disabled={isSending || isResetting}
              onClick={() => {
                void sendCode();
              }}
              type="button"
              variant="ghost"
            >
              Resend code
            </Button>
          )}

          <FieldDescription className="text-center text-white/60">
            Already have a password?{" "}
            <Link
              className="font-medium text-lime-200 underline underline-offset-4 hover:text-lime-100"
              to="/sign-in"
            >
              Sign in
            </Link>
          </FieldDescription>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
