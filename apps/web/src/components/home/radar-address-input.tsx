import { Input } from "@callcastlecare/ui/components/input";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import type { RadarAddressSuggestion } from "./use-radar-address-autocomplete";
import { useRadarAddressAutocomplete } from "./use-radar-address-autocomplete";

interface RadarAddressInputProps {
  error?: string;
  isValidated?: boolean;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: RadarAddressSuggestion) => void;
  value: string;
}

export const RadarAddressInput = ({
  error,
  isValidated = false,
  onChange,
  onSelectSuggestion,
  value,
}: RadarAddressInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isEnabled, isLoading, suggestions } =
    useRadarAddressAutocomplete(value);

  const shouldShowSuggestions = useMemo(
    () => isEnabled && isFocused && suggestions.length > 0,
    [isEnabled, isFocused, suggestions.length]
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is unavailable in this browser.");
      return;
    }

    setLocationError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onSelectSuggestion({
          id: `current-location-${Date.now()}`,
          label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          latitude,
          longitude,
          raw: { latitude, longitude },
        });
        setIsFocused(false);
        setIsLocating(false);
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
          "h-11 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-sm text-white placeholder:text-white/35 focus-visible:border-lime-300/50",
          isValidated && "text-lime-200"
        )}
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
        className="absolute left-2.5 top-5.5 inline-flex size-6 -translate-y-1/2 items-center justify-center text-white/45 transition-colors hover:text-lime-300"
        disabled={isLocating}
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
        <p className="mt-2 text-xs text-white/50">Searching addresses...</p>
      ) : null}
      {locationError ? (
        <p className="mt-2 text-xs text-rose-300">{locationError}</p>
      ) : null}

      {shouldShowSuggestions ? (
        <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                className="w-full px-3 py-2 text-left text-sm text-white/80 first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/10 hover:text-white"
                onClick={() => {
                  onSelectSuggestion(suggestion);
                  setIsFocused(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
