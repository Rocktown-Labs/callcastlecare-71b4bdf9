import { Input } from "@callcastlecare/ui/components/input";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import type { RadarAddressSuggestion } from "./use-radar-address-autocomplete";
import {
  reverseGeocodeAddress,
  useRadarAddressAutocomplete,
} from "./use-radar-address-autocomplete";

interface RadarAddressInputProps {
  className?: string;
  disabled?: boolean;
  error?: string;
  isValidated?: boolean;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: RadarAddressSuggestion) => void;
  tone?: "dark" | "light";
  value: string;
}

export const RadarAddressInput = ({
  className,
  disabled = false,
  error,
  isValidated = false,
  onChange,
  onSelectSuggestion,
  tone = "light",
  value,
}: RadarAddressInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isEnabled, isLoading, suggestions } = useRadarAddressAutocomplete(
    disabled ? "" : value
  );
  const trimmedValue = value.trim();
  const fallbackSuggestion: RadarAddressSuggestion | null =
    trimmedValue.length >= 5
      ? {
          id: `entered-${trimmedValue}`,
          label: trimmedValue,
          latitude: null,
          longitude: null,
          raw: { source: "manual-entry" },
        }
      : null;
  let shownSuggestions = suggestions;
  if (shownSuggestions.length === 0 && fallbackSuggestion) {
    shownSuggestions = [fallbackSuggestion];
  }

  const shouldShowSuggestions = useMemo(
    () => !disabled && isEnabled && isFocused && shownSuggestions.length > 0,
    [disabled, isEnabled, isFocused, shownSuggestions.length]
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is unavailable in this browser.");
      return;
    }

    setLocationError(null);
    setIsLocating(true);

    const selectCurrentPosition = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      try {
        const suggestion = await reverseGeocodeAddress(latitude, longitude);
        onSelectSuggestion(suggestion);
        setIsFocused(false);
      } catch {
        setLocationError("Unable to turn your location into an address.");
      } finally {
        setIsLocating(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void selectCurrentPosition(position);
      },
      () => {
        setLocationError("Unable to fetch your current location.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 12_000,
      }
    );
  };

  return (
    <div className="relative">
      <Input
        aria-autocomplete={isEnabled ? "list" : "none"}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 rounded-2xl pl-10 text-sm focus-visible:border-lime-300/50",
          tone === "dark"
            ? "border-white/10 bg-white/[0.06] text-white placeholder:text-white/40"
            : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-lime-400",
          className,
          disabled && "cursor-not-allowed opacity-70",
          isValidated && tone === "light" && "text-lime-700 font-bold",
          isValidated && tone === "dark" && "text-lime-100"
        )}
        disabled={disabled || isLocating}
        onBlur={() => {
          window.setTimeout(() => setIsFocused(false), 100);
        }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder="123 Main St, Little Rock, AR"
        value={value}
      />
      <button
        aria-label="Use my current location"
        className="absolute left-2.5 top-5.5 inline-flex size-6 -translate-y-1/2 items-center justify-center text-slate-400 transition-colors hover:text-lime-600"
        disabled={disabled || isLocating}
        onClick={handleUseCurrentLocation}
        type="button"
      >
        {isLocating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MapPin className="size-4" />
        )}
      </button>

      {isEnabled && isLoading && isFocused ? (
        <p className="mt-2 text-xs text-slate-500">Searching addresses...</p>
      ) : null}
      {locationError ? (
        <p className="mt-2 text-xs text-rose-300">{locationError}</p>
      ) : null}

      {shouldShowSuggestions ? (
        <ul
          className={cn(
            "absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border shadow-xl",
            tone === "dark"
              ? "border-white/10 bg-slate-900"
              : "border-slate-200 bg-white"
          )}
        >
          {shownSuggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                className={cn(
                  "w-full px-3 py-2 text-left text-sm first:rounded-t-2xl last:rounded-b-2xl",
                  tone === "dark"
                    ? "text-white/75 hover:bg-lime-300/10 hover:text-white"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                )}
                onClick={() => {
                  onSelectSuggestion(suggestion);
                  setIsFocused(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                {suggestions.length > 0
                  ? suggestion.label
                  : `Use "${suggestion.label}"`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
