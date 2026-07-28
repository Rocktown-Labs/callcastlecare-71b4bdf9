import { z } from "zod";

const phoneInputPattern = /^[\d\s()+.-]+$/u;
const phoneDigitPattern = /\d/gu;
const phoneInputStripPattern = /[^\d\s()+.-]/gu;
const nonDigitPattern = /\D/gu;
const minimumPhoneDigits = 10;
const maximumPhoneDigits = 15;

export const normalizePhoneInput = (value: string) =>
  value.replace(phoneInputStripPattern, "");

export const getPhoneDigitCount = (value: string) =>
  value.match(phoneDigitPattern)?.length ?? 0;

export const normalizeIntegerInput = (value: string) =>
  value.replace(nonDigitPattern, "");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .refine((value) => phoneInputPattern.test(value), {
    message: "Use numbers and phone punctuation only.",
  })
  .refine(
    (value) => {
      const digitCount = getPhoneDigitCount(value);
      return (
        digitCount >= minimumPhoneDigits && digitCount <= maximumPhoneDigits
      );
    },
    {
      message: "Enter a valid phone number.",
    }
  );

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(40)
  .refine((value) => value === "" || phoneInputPattern.test(value), {
    message: "Use numbers and phone punctuation only.",
  })
  .refine(
    (value) => {
      if (value === "") {
        return true;
      }

      const digitCount = getPhoneDigitCount(value);
      return (
        digitCount >= minimumPhoneDigits && digitCount <= maximumPhoneDigits
      );
    },
    {
      message: "Enter a valid phone number.",
    }
  )
  .optional()
  .or(z.literal(""));

export const positiveWholeNumberStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/u, "Enter a positive whole number.")
  .refine((value) => Number(value) > 0, {
    message: "Enter a positive whole number.",
  });
