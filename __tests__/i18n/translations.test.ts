import { translations, SUPPORTED_LOCALES, RTL_LOCALES, LOCALE_NAMES } from '../../app/i18n/translations';
import { rtlText } from '../../app/i18n/rtl';
import {
  PREPAREDNESS_TASKS,
  EMERGENCY_KIT_ITEMS,
  QUIZ_QUESTIONS,
  QUIZ_TOPICS,
} from '../../app/constants/preparedness';

type Bag = Record<string, unknown>;

/** Flattens to dotted paths so two locales can be compared key by key. */
function paths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value as Bag).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function get(bag: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Bag)?.[key], bag);
}

const en = translations.en;
const ur = translations.ur;

describe('locale registry', () => {
  it('names every supported locale', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      expect(LOCALE_NAMES[locale]).toBeTruthy();
    });
  });

  it('has a translation bundle per supported locale', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      expect(translations[locale]).toBeDefined();
    });
  });

  it('marks Urdu as right-to-left and English as not', () => {
    expect(RTL_LOCALES).toContain('ur');
    expect(RTL_LOCALES).not.toContain('en');
  });
});

describe('key parity', () => {
  // A missing key silently falls back to English, which reads as a bug rather
  // than an omission — so absence is asserted rather than left to inspection.
  it('Urdu defines every English key', () => {
    const missing = paths(en).filter((path) => get(ur, path) === undefined);
    expect(missing).toEqual([]);
  });

  it('Urdu introduces no keys English lacks', () => {
    const extra = paths(ur).filter((path) => get(en, path) === undefined);
    expect(extra).toEqual([]);
  });

  it('leaves no value empty in either locale', () => {
    const empty = SUPPORTED_LOCALES.flatMap((locale) =>
      paths(translations[locale])
        .filter((path) => {
          const value = get(translations[locale], path);
          return typeof value === 'string' && value.trim() === '';
        })
        .map((path) => `${locale}.${path}`)
    );
    expect(empty).toEqual([]);
  });

  it('preserves interpolation placeholders across locales', () => {
    const mismatched = paths(en)
      .filter((path) => {
        const source = get(en, path);
        const target = get(ur, path);
        if (typeof source !== 'string' || typeof target !== 'string') return false;

        const tokens = (text: string) => (text.match(/\{\{(\w+)\}\}/g) ?? []).sort().join(',');
        return tokens(source) !== tokens(target);
      });

    expect(mismatched).toEqual([]);
  });
});

describe('content coverage', () => {
  it('translates every preparedness task in both locales', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      PREPAREDNESS_TASKS.forEach((task) => {
        const entry = get(translations[locale], `content.tasks.${task.id}`) as Bag;
        expect(entry?.title).toBeTruthy();
        expect(entry?.description).toBeTruthy();
      });
    });
  });

  it('translates every kit item in both locales', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      EMERGENCY_KIT_ITEMS.forEach((item) => {
        const entry = get(translations[locale], `content.kit.${item.id}`) as Bag;
        expect(entry?.title).toBeTruthy();
        expect(entry?.description).toBeTruthy();
      });
    });
  });

  it('translates every quiz topic in both locales', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      QUIZ_TOPICS.forEach((topic) => {
        expect(get(translations[locale], `content.topics.${topic}`)).toBeTruthy();
      });
    });
  });

  it('gives every question text, four options and an explanation in both locales', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      QUIZ_QUESTIONS.forEach((question) => {
        const entry = get(translations[locale], `content.questions.${question.id}`) as Bag;
        expect(entry?.question).toBeTruthy();
        expect(entry?.explanation).toBeTruthy();
        expect(entry?.options).toHaveLength(4);
      });
    });
  });

  // An out-of-range index would mark every answer wrong with no visible error.
  it('keeps each correct answer index within its option list', () => {
    QUIZ_QUESTIONS.forEach((question) => {
      const options = get(en, `content.questions.${question.id}.options`) as string[];
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(options.length);
    });
  });

  it('assigns every question to a declared topic', () => {
    QUIZ_QUESTIONS.forEach((question) => {
      expect(QUIZ_TOPICS).toContain(question.topic);
    });
  });
});

describe('rtlText', () => {
  it('right-aligns and sets writing direction for RTL', () => {
    expect(rtlText(true)).toEqual({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('applies nothing for LTR, leaving inherited alignment intact', () => {
    expect(rtlText(false)).toEqual({});
  });
});
