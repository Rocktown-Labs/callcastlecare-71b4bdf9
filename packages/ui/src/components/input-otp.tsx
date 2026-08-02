import { cn } from "@callcastlecare/ui/lib/utils";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import * as React from "react";

const InputOTP = ({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) => (
  <OTPInput
    data-slot="input-otp"
    containerClassName={cn(
      "flex items-center gap-2 has-disabled:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
);

const InputOTPGroup = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="input-otp-group"
    className={cn("flex items-center", className)}
    {...props}
  />
);

const InputOTPSlot = ({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext?.slots[index];

  return (
    <div
      data-slot="input-otp-slot"
      data-active={slot?.isActive}
      aria-invalid={props["aria-invalid"]}
      className={cn(
        "relative flex size-11 items-center justify-center border border-input bg-background text-sm font-semibold text-foreground shadow-xs transition-all first:rounded-l-md last:rounded-r-md data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-1 data-[active=true]:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      {slot?.char}
      {slot?.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
};

const InputOTPSeparator = (props: React.ComponentProps<"div">) => (
  <div data-slot="input-otp-separator" {...props}>
    <MinusIcon />
  </div>
);

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
