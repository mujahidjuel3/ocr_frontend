export const OCR_LANGUAGE_OPTIONS = [
  { value: "", label: "Configured default" },
  { value: "eng", label: "English (best for Latin invoices)" },
  { value: "ben", label: "Bengali" },
  { value: "ben+eng", label: "Bengali + English" },
  { value: "ara", label: "Arabic" },
  { value: "hin", label: "Hindi" },
  { value: "urd", label: "Urdu" },
  { value: "fas", label: "Persian" },
  { value: "chi_sim", label: "Chinese Simplified" },
  { value: "chi_tra", label: "Chinese Traditional" },
  { value: "jpn", label: "Japanese" },
  { value: "kor", label: "Korean" },
  { value: "tha", label: "Thai" },
  { value: "rus", label: "Russian" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "spa", label: "Spanish" },
  { value: "por", label: "Portuguese" },
  { value: "ita", label: "Italian" },
  { value: "tur", label: "Turkish" },
  { value: "vie", label: "Vietnamese" },
] as const;

/** Blank keeps the server default and is omitted from the upload body. */
export function uploadLanguage(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
