import settings from "../site.config.json" with { type: "json" };
import th from "./th.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

export const languages = ["en", "th"] as const;
export type Language = (typeof languages)[number];
export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;
export const dictionaries = { en, th } satisfies Record<Language, Dictionary>;

// PUBLIC_SITE_LANGUAGE is an optional build override, also usable by Node tests.
const requestedLanguage =
  import.meta.env?.PUBLIC_SITE_LANGUAGE ||
  (typeof process !== "undefined"
    ? process.env.PUBLIC_SITE_LANGUAGE
    : undefined) ||
  settings.language;
if (!languages.some((value) => value === requestedLanguage)) {
  throw new Error(
    `Unsupported site language: ${requestedLanguage}. Use en or th in src/site.config.json.`,
  );
}
export const language = requestedLanguage as Language;
export const locales = { en: "en-US", th: "th-TH" } as const;
export const locale = locales[language];
export const ogLocale = { en: "en_US", th: "th_TH" }[language];

export function translate(
  lang: Language,
  key: TranslationKey,
  values: Record<string, string | number> = {},
): string {
  const dictionary: Dictionary = dictionaries[lang];
  const overrides = settings.text[lang] as Partial<Dictionary>;
  const singularKey = `${key}.one` as TranslationKey;
  const selectedKey =
    typeof values.count === "number" &&
    new Intl.PluralRules(locales[lang]).select(values.count) === "one" &&
    singularKey in dictionary
      ? singularKey
      : key;
  const text = overrides[selectedKey] ?? dictionary[selectedKey];
  if (typeof text !== "string")
    throw new Error(`Unknown translation key: ${selectedKey}`);
  const parameters = {
    site: settings.site.name,
    name: settings.author.name[lang],
    ...values,
  };
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in parameters
      ? String(parameters[name as keyof typeof parameters])
      : placeholder,
  );
}
export const t = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => translate(language, key, values);

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...options,
  }).format(new Date(value));
}

export const translator =
  (lang: Language) =>
  (key: TranslationKey, values?: Record<string, string | number>) =>
    translate(lang, key, values);
export const homePath = (lang: Language) => (lang === "th" ? "/th/" : "/");
