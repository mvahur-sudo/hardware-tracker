import { Locale } from './types';
import en from '../messages/en';
import et from '../messages/et';

export const locales: Locale[] = ['en', 'et'];

const dictionaries = { en, et } as const;

export function getDictionary(locale: string) {
  return dictionaries[(locale as Locale) || 'en'] ?? dictionaries.en;
}

export function t(locale: string, key: string): string {
  const dict = getDictionary(locale);
  return key.split('.').reduce<any>((acc, part) => acc?.[part], dict) ?? key;
}
