export const SUPPORTED_LOCALES = ['en', 'ur'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ur: 'اردو',
};

/** Locales written right-to-left, which drive layout direction. */
export const RTL_LOCALES: SupportedLocale[] = ['ur'];

export const translations = {
  en: {
    tabs: {
      dashboard: 'Dashboard',
      prepare: 'Prepare',
      alerts: 'Alerts',
      emergencyInfo: 'Emergency Info',
    },
    home: {
      title: 'Dashboard',
      subtitle: 'Your disaster preparedness overview',
      scoreTitle: 'Preparedness Score',
      scoreBreakdown: 'Tasks {{tasks}} · Kit {{kit}} · Quiz {{quiz}}',
      locationTitle: 'Your Location',
      monitoredZones: 'Monitored Zones',
      inZone: 'You are in a disaster zone',
      loadingZones: 'Loading zones…',
      zonesMonitored: '{{count}} zones monitored',
      noZones: 'No active zones. Alerts will appear here when one is published.',
      waitingLocation: 'Waiting for your location…',
      awaitingFix: 'Waiting for location…',
      insideZone: 'Inside · {{distance}}km from centre',
      awayFromZone: '{{distance}}km away · {{radius}}km radius',
    },
    prepare: {
      title: 'Prepare',
      subtitle: 'Build your emergency readiness',
      tasksTitle: 'Preparation Tasks',
      quizzesTitle: 'Knowledge Quizzes',
      tasksProgress: '{{done}} of {{total}} completed',
      quizProgress: '{{done}} of {{total}} mastered',
      questionsMastered: '{{total}} questions • {{done}}/{{total}} mastered',
      nextReview: 'Next review {{date}}',
    },
    alerts: {
      title: 'Alerts',
      live: 'Live from the national alert feed',
      cached: 'Offline — showing last synced alerts',
      defaults: 'Offline — showing default zones',
      loading: 'Loading active alerts…',
      testButton: 'Send Test Alert',
      activeAlerts: 'Active Alerts ({{count}})',
      none: 'No active alerts. Published alerts appear here automatically.',
    },
    emergency: {
      kitTitle: 'Household Emergency Kit',
      completion: 'Completion: {{done}}/{{total}} ({{percent}}%)',
    },
    onboarding: {
      skip: 'Skip',
      next: 'Next',
      getStarted: 'Get Started',
    },
    quiz: {
      questionOf: 'Question {{current}} of {{total}}',
      correct: 'Correct',
      incorrect: 'Not quite',
      next: 'Next question',
      seeResults: 'See results',
      done: 'Done',
      exit: 'Exit',
    },
    common: {
      offline: 'Offline — using cached data',
      language: 'Language',
    },
  },
  ur: {
    tabs: {
      dashboard: 'ڈیش بورڈ',
      prepare: 'تیاری',
      alerts: 'الرٹس',
      emergencyInfo: 'ہنگامی معلومات',
    },
    home: {
      title: 'ڈیش بورڈ',
      subtitle: 'آپ کی آفات سے تیاری کا جائزہ',
      scoreTitle: 'تیاری کا اسکور',
      scoreBreakdown: 'کام {{tasks}} · کٹ {{kit}} · کوئز {{quiz}}',
      locationTitle: 'آپ کا مقام',
      monitoredZones: 'زیر نگرانی علاقے',
      inZone: 'آپ آفت زدہ علاقے میں ہیں',
      loadingZones: 'علاقے لوڈ ہو رہے ہیں…',
      zonesMonitored: '{{count}} علاقے زیر نگرانی',
      noZones: 'کوئی فعال علاقہ نہیں۔ الرٹ جاری ہونے پر یہاں ظاہر ہوگا۔',
      waitingLocation: 'آپ کے مقام کا انتظار…',
      awaitingFix: 'مقام کا انتظار…',
      insideZone: 'اندر · مرکز سے {{distance}} کلومیٹر',
      awayFromZone: '{{distance}} کلومیٹر دور · {{radius}} کلومیٹر دائرہ',
    },
    prepare: {
      title: 'تیاری',
      subtitle: 'اپنی ہنگامی تیاری مضبوط کریں',
      tasksTitle: 'تیاری کے کام',
      quizzesTitle: 'معلوماتی کوئز',
      tasksProgress: '{{total}} میں سے {{done}} مکمل',
      quizProgress: '{{total}} میں سے {{done}} مہارت حاصل',
      questionsMastered: '{{total}} سوالات • {{done}}/{{total}} مہارت',
      nextReview: 'اگلا جائزہ {{date}}',
    },
    alerts: {
      title: 'الرٹس',
      live: 'قومی الرٹ فیڈ سے براہ راست',
      cached: 'آف لائن — آخری محفوظ شدہ الرٹس',
      defaults: 'آف لائن — طے شدہ علاقے',
      loading: 'فعال الرٹس لوڈ ہو رہے ہیں…',
      testButton: 'ٹیسٹ الرٹ بھیجیں',
      activeAlerts: 'فعال الرٹس ({{count}})',
      none: 'کوئی فعال الرٹ نہیں۔ جاری کردہ الرٹس خودبخود یہاں آئیں گے۔',
    },
    emergency: {
      kitTitle: 'گھریلو ہنگامی کٹ',
      completion: 'تکمیل: {{done}}/{{total}} ({{percent}}%)',
    },
    onboarding: {
      skip: 'چھوڑیں',
      next: 'اگلا',
      getStarted: 'شروع کریں',
    },
    quiz: {
      questionOf: '{{total}} میں سے سوال {{current}}',
      correct: 'درست',
      incorrect: 'غلط',
      next: 'اگلا سوال',
      seeResults: 'نتائج دیکھیں',
      done: 'مکمل',
      exit: 'باہر نکلیں',
    },
    common: {
      offline: 'آف لائن — محفوظ شدہ ڈیٹا استعمال ہو رہا ہے',
      language: 'زبان',
    },
  },
};
