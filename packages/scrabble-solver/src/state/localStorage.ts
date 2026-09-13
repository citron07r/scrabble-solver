import { Board, type BoardJson, Game, isObject, type Locale } from '@scrabble-solver/types';
import store2 from 'store2';

import { englishTranslations } from '@/i18n/i18n';
import type { Rack, TranslationKey, Translations } from '@/types';

import type { SettingsState } from './settings/types';

const BOARD = 'board';
const RACK = 'rack';
const SETTINGS = 'settings';
const TRANSLATIONS = 'translations';

interface PersistedTranslations {
  locale: Locale;
  translations: Translations;
  version: string;
}

const LEGACY_KEYS: Record<keyof SettingsState, string> = {
  autoGroupTiles: 'auto-group-tiles',
  game: 'config-id',
  highlightUnreachableCells: 'highlight-unreachable-cells',
  inputMode: 'input-mode',
  locale: 'locale',
  removeCellFilters: 'remove-cell-filters',
  showCoordinates: 'show-coordinates',
};

const store = store2.namespace('scrabble-solver');

export const localStorage = {
  getBoard(): Board | undefined {
    try {
      const serialized = store.get(BOARD) as string | undefined;
      return serialized ? Board.fromJson(JSON.parse(serialized) as BoardJson) : undefined;
    } catch {
      store.remove(BOARD);
      return undefined;
    }
  },

  setBoard(board: Board | undefined): void {
    const serialized = board ? JSON.stringify(board.toJson()) : board;
    store.set(BOARD, serialized, true);
  },

  getRack(): Rack | undefined {
    const rack = store.get(RACK) as Rack | undefined;

    if (rack !== undefined && !Array.isArray(rack)) {
      store.remove(RACK);
      return undefined;
    }

    return rack?.map((character) => (character === LEGACY_UNKNOWN_DRAW ? null : character));
  },

  setRack(rack: Rack | undefined): void {
    store.set(RACK, rack, true);
  },

  getSettings(): Partial<SettingsState> {
    const stored = store.get(SETTINGS) as Partial<SettingsState> | undefined;

    if (stored !== undefined && !isObject(stored)) {
      store.remove(SETTINGS);
    }

    const settings = migrateHiddenShowCoordinates(isObject(stored) ? stored : migrateLegacySettings());
    const game = settings.game ? LEGACY_GAMES[settings.game] : undefined;
    return game ? { ...settings, game } : settings;
  },

  setSettings(settings: SettingsState): void {
    store.set(SETTINGS, settings, true);
  },

  getTranslations(locale: Locale, version: string): Translations | undefined {
    const stored = store.get(TRANSLATIONS) as PersistedTranslations | undefined;

    if (typeof stored === 'undefined') {
      return undefined;
    }

    if (
      !isObject(stored) ||
      stored.locale !== locale ||
      stored.version !== version ||
      !isObject(stored.translations) ||
      !hasEveryTranslation(stored.translations)
    ) {
      store.remove(TRANSLATIONS);
      return undefined;
    }

    return stored.translations;
  },

  setTranslations(locale: Locale, version: string, translations: Translations): void {
    store.set(TRANSLATIONS, { locale, translations, version } satisfies PersistedTranslations, true);
  },
};

function hasEveryTranslation(translations: Translations): boolean {
  return (Object.keys(englishTranslations) as TranslationKey[]).every((key) => typeof translations[key] === 'string');
}

/**
 * Best-draw analysis briefly shipped as a "?" marker typed into any game's rack,
 * then as a game called "best-draw", before settling on Duplicat Completiv. A
 * persisted marker is no longer a valid character and the old game id no longer
 * resolves to a config, so both are rewritten on read.
 *
 * Introduced in 2.17.1 on 2026/08/09.
 * Life expectancy: 1y.
 */
const LEGACY_UNKNOWN_DRAW = '?';

const LEGACY_GAMES: Record<string, Game> = {
  'best-draw': Game.DuplicatCompletiv,
};

/**
 * Introduced in 2.15.26 on 2026/04/27.
 * Life expectancy: 1y.
 */
function migrateLegacySettings(): Partial<SettingsState> {
  const settings: Partial<SettingsState> = {};
  let hasLegacy = false;

  for (const [setting, legacyKey] of Object.entries(LEGACY_KEYS) as [keyof SettingsState, string][]) {
    if (store.has(legacyKey)) {
      settings[setting] = store.get(legacyKey);
      store.remove(legacyKey);
      hasLegacy = true;
    }
  }

  if (hasLegacy) {
    store.set(SETTINGS, settings, true);
  }

  return settings;
}

/**
 * The 'hidden' showCoordinates option was removed on 2026/08/13.
 * Life expectancy: 1y.
 */
function migrateHiddenShowCoordinates(settings: Partial<SettingsState>): Partial<SettingsState> {
  if (String(settings.showCoordinates) !== 'hidden') {
    return settings;
  }

  const migrated: Partial<SettingsState> = { ...settings, showCoordinates: 'original' };
  store.set(SETTINGS, migrated, true);
  return migrated;
}
