import * as amplitude from "@amplitude/unified";
import { env } from "@callcastlecare/env/web";

const AMPLITUDE_API_KEY = env.VITE_AMPLITUDE_API_KEY;

let isInitialized = false;

export const initAmplitude = () => {
  if (typeof window === "undefined" || isInitialized) {
    return;
  }

  if (!AMPLITUDE_API_KEY) {
    console.warn("Amplitude API key missing — analytics disabled");
    return;
  }

  amplitude.initAll(AMPLITUDE_API_KEY, {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });

  isInitialized = true;
};

export const trackAmplitudeEvent = (
  eventName: string,
  eventProperties: Record<string, unknown> = {}
) => {
  if (typeof window === "undefined") {
    return;
  }

  amplitude.track(eventName, {
    prompt_version: "BA400.4",
    ...eventProperties,
  });
};
