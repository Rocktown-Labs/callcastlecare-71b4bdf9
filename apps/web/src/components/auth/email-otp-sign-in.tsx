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
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { sendVerificationOtp, signInWithEmailOtp } from "@/lib/auth/email-otp";

interface EmailOtpSignInProps {
  className?: string;
  description?: string;
  email?: string;
  redirectTo?: string;
  title?: string;
}

const OTP_LENGTH = 6;

export const EmailOtpSignIn = ({
  className,
  description = "Enter your email and we will send a secure one-time code.",
  email: initialEmail = "",
  redirectTo = "/dashboard",
  title = "Sign in with a code",
}: EmailOtpSignInProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [hasCode, setHasCode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sendCode = async () => {
    setFormError(null);
    setIsSending(true);

    try {
      await sendVerificationOtp({ email, type: "sign-in" });
      setHasCode(true);
      toast.success("Code sent. Check your email.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not send the code."
      );
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    setFormError(null);
    setIsVerifying(true);

    try {
      await signInWithEmailOtp({ email, otp });
      await navigate({ to: redirectTo });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The code could not be verified."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader className="px-5 pt-5 sm:px-6">
        <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-lime-300/20 bg-lime-300/10 text-lime-200">
          <MailCheck aria-hidden="true" className="size-5" />
        </div>
        <CardTitle className="text-xl font-semibold text-white">
          {title}
        </CardTitle>
        <CardDescription className="text-white/60">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 sm:px-6">
        <FieldGroup>
          <Field data-invalid={!!formError && !hasCode}>
            <FieldLabel htmlFor="email-otp-email">Email</FieldLabel>
            <Input
              autoComplete="email"
              className="h-11 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/36"
              disabled={isSending || isVerifying || hasCode}
              id="email-otp-email"
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
            <Field data-invalid={!!formError}>
              <FieldLabel>One-time code</FieldLabel>
              <InputOTP
                containerClassName="justify-center"
                disabled={isVerifying}
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
              <FieldDescription className="text-center text-white/50">
                Codes expire after 10 minutes.
              </FieldDescription>
            </Field>
          )}

          {formError && <FieldError>{formError}</FieldError>}

          {hasCode ? (
            <Button
              className="h-11 rounded-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200"
              disabled={isVerifying || otp.length !== OTP_LENGTH}
              onClick={() => {
                void verifyCode();
              }}
              type="button"
            >
              {isVerifying && <Spinner />}
              Continue
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
              Email me a code
            </Button>
          )}

          {hasCode && (
            <Button
              className="h-10 rounded-full text-white/75 hover:bg-white/10 hover:text-white"
              disabled={isSending || isVerifying}
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
            Prefer a password?{" "}
            <Link
              className="font-medium text-lime-200 underline underline-offset-4 hover:text-lime-100"
              to="/sign-in"
            >
              Sign in here
            </Link>
          </FieldDescription>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
