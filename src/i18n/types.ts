export type SupportedLanguage = 'en' | 'om' | 'am';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flagCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flagCode: 'EN',
  },
  {
    code: 'om',
    name: 'Oromo',
    nativeName: 'Afaan Oromoo',
    flagCode: 'OM',
  },
  {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    flagCode: 'AM',
  },
];
