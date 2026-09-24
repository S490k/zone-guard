/**
 * Localised copy for preparedness content. Kept apart from the UI strings in
 * `translations.ts` because this is subject matter rather than chrome, and it
 * grows with every task, kit item or question added.
 *
 * Structure is keyed by the ids in `constants/preparedness.ts`, which holds only
 * the structural data (priority, topic, correct answer) so no English text
 * survives in the constants.
 */

export const contentEn = {
  badges: {
    'first-step': { title: 'First Step', description: 'Complete your first preparedness task' },
    'planner': { title: 'Planner', description: 'Complete every preparedness task' },
    'kit-started': { title: 'Kit Started', description: 'Gather half your emergency kit' },
    'kit-complete': { title: 'Kit Complete', description: 'Gather every emergency kit item' },
    'curious': { title: 'Curious', description: 'Answer your first quiz question' },
    'scholar': { title: 'Scholar', description: 'Master every quiz question' },
    'ready': { title: 'Ready', description: 'Complete the tasks, the kit and the quizzes' },
  },
  tiers: {
    none: 'Getting Started',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  },
  guides: {
    earthquake: {
      title: 'Earthquake Safety',
      tips: [
        'DROP, COVER, HOLD ON at first shake',
        'Get under a sturdy table or against an interior wall',
        'Stay away from windows and heavy objects',
        'Do not run outside',
      ],
    },
    flood: {
      title: 'Flood Preparedness',
      tips: [
        'Evacuate immediately if ordered',
        'Move to higher ground',
        'Do not drive through flooded areas',
        'Turn off utilities if instructed',
      ],
    },
    heat: {
      title: 'Heat Wave Safety',
      tips: [
        'Stay hydrated — drink water constantly',
        'Stay in cool, air-conditioned places',
        'Avoid strenuous activity during peak heat',
        'Check on elderly neighbours',
      ],
    },
    general: {
      title: 'General Emergency Response',
      tips: [
        'Call emergency services only if necessary',
        'Listen to official broadcasts',
        'Account for all family members',
        'Help others if safe to do so',
      ],
    },
  },
  tasks: {
    'task-contacts': {
      title: 'Create Emergency Contact List',
      description: 'Add 3-5 emergency contacts',
    },
    'task-go-bag': {
      title: 'Prepare Go-Bag',
      description: 'Pack essential items (documents, cash, medications)',
    },
    'task-meeting-point': {
      title: 'Identify Safe Meeting Point',
      description: 'Choose a location to meet family members',
    },
    'task-procedures': {
      title: 'Review Emergency Procedures',
      description: 'Read through earthquake and flood procedures',
    },
    'task-insurance': {
      title: 'Update Insurance Information',
      description: 'Ensure your insurance details are current',
    },
  },
  kit: {
    'kit-water': { title: 'Water', description: '3-day supply (4 litres per person per day)' },
    'kit-food': { title: 'Non-perishable Food', description: '3-day supply (high-calorie items)' },
    'kit-first-aid': { title: 'First Aid Kit', description: 'Bandages, medications, antiseptic' },
    'kit-flashlight': { title: 'Flashlight & Batteries', description: 'Extra batteries included' },
    'kit-radio': { title: 'Radio (Battery/Hand-crank)', description: 'For emergency broadcasts' },
    'kit-medications': { title: 'Medications & Glasses', description: '7-day supply of prescription medications' },
    'kit-documents': { title: 'Documents & Cash', description: 'ID, insurance, cash in waterproof bag' },
    'kit-hygiene': { title: 'Personal Hygiene Items', description: 'Toiletries, feminine products, diapers' },
    'kit-charger': { title: 'Phone Charger & Power Bank', description: 'Multiple charging options' },
    'kit-contact-card': { title: 'Emergency Contact Card', description: 'Written copy of important numbers' },
  },
  topics: {
    earthquake: 'Earthquake Safety',
    flood: 'Flood Preparedness',
    firstAid: 'First Aid Basics',
  },
  questions: {
    'q-eq-1': {
      question: 'What should you do the moment shaking starts indoors?',
      options: ['Run outside immediately', 'Drop, cover and hold on', 'Stand in a doorway', 'Take the lift downstairs'],
      explanation: 'Most injuries come from falling objects. Drop, cover and hold on protects you where you are; running outside exposes you to falling debris.',
    },
    'q-eq-2': {
      question: 'Where is the safest place to shelter inside a room?',
      options: ['Beside a window', 'Under a sturdy table', 'Against a tall bookshelf', 'In the centre of the room'],
      explanation: 'A sturdy table shields you from falling debris. Windows shatter and tall furniture topples.',
    },
    'q-eq-3': {
      question: 'After the shaking stops, what is the first thing to check?',
      options: ['Social media for news', 'Yourself and others for injuries', 'Whether the power is back', 'The structural damage outside'],
      explanation: 'Injuries take priority. Aftershocks may follow, so assess people before property.',
    },
    'q-fl-1': {
      question: 'How much moving water can sweep a car away?',
      options: ['About 30cm', 'About 1 metre', 'About 2 metres', 'Only water above roof height'],
      explanation: 'Just 30cm of moving water can float most vehicles. Never drive through floodwater.',
    },
    'q-fl-2': {
      question: 'An evacuation order is issued for your area. What do you do?',
      options: ['Wait to see if water reaches you', 'Leave immediately via the designated route', 'Move belongings upstairs first', 'Stay to protect your property'],
      explanation: 'Evacuation orders account for conditions you cannot see. Delay removes your safe exit.',
    },
    'q-fl-3': {
      question: 'Why should you avoid walking through standing floodwater?',
      options: ['It is merely uncomfortable', 'It may be electrically charged or contaminated', 'It slows you down', 'It damages footwear'],
      explanation: 'Floodwater hides downed power lines, sewage and debris. Electrocution and infection are real risks.',
    },
    'q-fa-1': {
      question: 'What is the first step for severe external bleeding?',
      options: ['Apply a tourniquet immediately', 'Apply firm direct pressure', 'Rinse the wound thoroughly', 'Elevate and wait'],
      explanation: 'Direct pressure controls most bleeding. A tourniquet is for limb bleeding that pressure cannot stop.',
    },
    'q-fa-2': {
      question: 'Someone is unresponsive but breathing normally. What position?',
      options: ['Flat on their back', 'Sitting upright', 'The recovery position on their side', 'Legs raised above the head'],
      explanation: 'The recovery position keeps the airway clear and prevents choking if they vomit.',
    },
    'q-fa-3': {
      question: 'What is the first sign of heat exhaustion to watch for?',
      options: ['Hot dry skin', 'Heavy sweating with dizziness', 'Complete loss of consciousness', 'A slow, strong pulse'],
      explanation: 'Heavy sweating with dizziness signals heat exhaustion. Hot dry skin indicates heatstroke, a medical emergency.',
    },
  },
};

export const contentUr = {
  badges: {
    'first-step': { title: 'پہلا قدم', description: 'تیاری کا پہلا کام مکمل کریں' },
    'planner': { title: 'منصوبہ ساز', description: 'تیاری کے تمام کام مکمل کریں' },
    'kit-started': { title: 'کٹ کا آغاز', description: 'ہنگامی کٹ کا نصف جمع کریں' },
    'kit-complete': { title: 'کٹ مکمل', description: 'ہنگامی کٹ کی تمام اشیاء جمع کریں' },
    'curious': { title: 'متجسس', description: 'اپنا پہلا سوال حل کریں' },
    'scholar': { title: 'ماہر', description: 'تمام سوالات میں مہارت حاصل کریں' },
    'ready': { title: 'تیار', description: 'کام، کٹ اور کوئز سب مکمل کریں' },
  },
  tiers: {
    none: 'ابتدا',
    bronze: 'کانسی',
    silver: 'چاندی',
    gold: 'سونا',
    platinum: 'پلاٹینم',
  },
  guides: {
    earthquake: {
      title: 'زلزلے سے حفاظت',
      tips: [
        'پہلے جھٹکے پر جھکیں، سر ڈھانپیں، پکڑے رہیں',
        'مضبوط میز کے نیچے یا اندرونی دیوار کے ساتھ جائیں',
        'کھڑکیوں اور بھاری اشیاء سے دور رہیں',
        'باہر کی طرف نہ بھاگیں',
      ],
    },
    flood: {
      title: 'سیلاب کی تیاری',
      tips: [
        'حکم ملنے پر فوراً انخلا کریں',
        'بلند جگہ کی طرف منتقل ہوں',
        'سیلابی علاقوں میں گاڑی نہ چلائیں',
        'ہدایت ملنے پر بجلی اور گیس بند کر دیں',
      ],
    },
    heat: {
      title: 'گرمی کی لہر سے حفاظت',
      tips: [
        'مسلسل پانی پیتے رہیں',
        'ٹھنڈی اور ہوادار جگہوں پر رہیں',
        'شدید گرمی میں سخت کام سے گریز کریں',
        'بزرگ ہمسایوں کا خیال رکھیں',
      ],
    },
    general: {
      title: 'عمومی ہنگامی اقدامات',
      tips: [
        'ضرورت ہو تو ہی ہنگامی خدمات کو کال کریں',
        'سرکاری اعلانات سنتے رہیں',
        'تمام افرادِ خانہ کی موجودگی یقینی بنائیں',
        'محفوظ ہو تو دوسروں کی مدد کریں',
      ],
    },
  },
  tasks: {
    'task-contacts': {
      title: 'ہنگامی رابطوں کی فہرست بنائیں',
      description: 'تین سے پانچ ہنگامی رابطے شامل کریں',
    },
    'task-go-bag': {
      title: 'ہنگامی بیگ تیار کریں',
      description: 'ضروری اشیاء رکھیں (دستاویزات، نقدی، ادویات)',
    },
    'task-meeting-point': {
      title: 'محفوظ ملاقات کی جگہ متعین کریں',
      description: 'گھر والوں سے ملنے کے لیے جگہ منتخب کریں',
    },
    'task-procedures': {
      title: 'ہنگامی طریقہ کار کا جائزہ لیں',
      description: 'زلزلے اور سیلاب کے طریقہ کار پڑھیں',
    },
    'task-insurance': {
      title: 'انشورنس کی معلومات اپ ڈیٹ کریں',
      description: 'یقینی بنائیں کہ انشورنس کی تفصیلات موجودہ ہیں',
    },
  },
  kit: {
    'kit-water': { title: 'پانی', description: 'تین دن کا ذخیرہ (فی فرد روزانہ چار لیٹر)' },
    'kit-food': { title: 'خشک خوراک', description: 'تین دن کا ذخیرہ (زیادہ کیلوری والی اشیاء)' },
    'kit-first-aid': { title: 'ابتدائی طبی امداد کا بکس', description: 'پٹیاں، ادویات، جراثیم کش' },
    'kit-flashlight': { title: 'ٹارچ اور بیٹریاں', description: 'اضافی بیٹریاں شامل کریں' },
    'kit-radio': { title: 'ریڈیو (بیٹری یا ہینڈ کرینک)', description: 'ہنگامی نشریات کے لیے' },
    'kit-medications': { title: 'ادویات اور عینک', description: 'سات دن کی تجویز کردہ ادویات' },
    'kit-documents': { title: 'دستاویزات اور نقدی', description: 'شناختی کارڈ، انشورنس، نقدی واٹر پروف تھیلے میں' },
    'kit-hygiene': { title: 'ذاتی صفائی کی اشیاء', description: 'صفائی کا سامان، خواتین کی اشیاء، ڈائپر' },
    'kit-charger': { title: 'فون چارجر اور پاور بینک', description: 'چارجنگ کے متعدد ذرائع' },
    'kit-contact-card': { title: 'ہنگامی رابطہ کارڈ', description: 'اہم نمبروں کی تحریری نقل' },
  },
  topics: {
    earthquake: 'زلزلے سے حفاظت',
    flood: 'سیلاب کی تیاری',
    firstAid: 'ابتدائی طبی امداد',
  },
  questions: {
    'q-eq-1': {
      question: 'گھر کے اندر جھٹکے شروع ہوتے ہی آپ کو کیا کرنا چاہیے؟',
      options: ['فوراً باہر بھاگیں', 'جھک جائیں، سر ڈھانپیں اور پکڑے رہیں', 'دروازے میں کھڑے ہو جائیں', 'لفٹ سے نیچے جائیں'],
      explanation: 'زیادہ تر چوٹیں گرنے والی اشیاء سے آتی ہیں۔ جھک کر پناہ لینا آپ کو وہیں محفوظ رکھتا ہے، جبکہ باہر بھاگنا ملبے کی زد میں لے آتا ہے۔',
    },
    'q-eq-2': {
      question: 'کمرے کے اندر پناہ لینے کی سب سے محفوظ جگہ کون سی ہے؟',
      options: ['کھڑکی کے پاس', 'مضبوط میز کے نیچے', 'اونچی الماری کے ساتھ', 'کمرے کے وسط میں'],
      explanation: 'مضبوط میز گرنے والے ملبے سے بچاتی ہے۔ کھڑکیاں ٹوٹ جاتی ہیں اور اونچا فرنیچر گر جاتا ہے۔',
    },
    'q-eq-3': {
      question: 'جھٹکے رکنے کے بعد سب سے پہلے کیا دیکھنا چاہیے؟',
      options: ['خبروں کے لیے سوشل میڈیا', 'اپنی اور دوسروں کی چوٹیں', 'بجلی واپس آئی یا نہیں', 'باہر عمارت کا نقصان'],
      explanation: 'چوٹیں سب سے پہلے اہم ہیں۔ آفٹر شاک آ سکتے ہیں، اس لیے املاک سے پہلے لوگوں کا جائزہ لیں۔',
    },
    'q-fl-1': {
      question: 'کتنا بہتا ہوا پانی گاڑی کو بہا لے جا سکتا ہے؟',
      options: ['تقریباً تیس سینٹی میٹر', 'تقریباً ایک میٹر', 'تقریباً دو میٹر', 'صرف چھت سے اوپر کا پانی'],
      explanation: 'صرف تیس سینٹی میٹر بہتا پانی زیادہ تر گاڑیوں کو بہا سکتا ہے۔ سیلابی پانی میں گاڑی کبھی نہ چلائیں۔',
    },
    'q-fl-2': {
      question: 'آپ کے علاقے کے لیے انخلا کا حکم جاری ہوا ہے۔ آپ کیا کریں گے؟',
      options: ['انتظار کریں کہ پانی آپ تک پہنچتا ہے یا نہیں', 'مقررہ راستے سے فوراً نکل جائیں', 'پہلے سامان اوپر منتقل کریں', 'جائیداد کی حفاظت کے لیے رکے رہیں'],
      explanation: 'انخلا کے احکامات ان حالات کو مدنظر رکھتے ہیں جو آپ کو نظر نہیں آتے۔ تاخیر آپ کا محفوظ راستہ ختم کر دیتی ہے۔',
    },
    'q-fl-3': {
      question: 'کھڑے سیلابی پانی میں چلنے سے کیوں گریز کرنا چاہیے؟',
      options: ['یہ صرف تکلیف دہ ہوتا ہے', 'اس میں بجلی یا آلودگی ہو سکتی ہے', 'یہ آپ کی رفتار کم کرتا ہے', 'یہ جوتے خراب کرتا ہے'],
      explanation: 'سیلابی پانی میں گرے ہوئے بجلی کے تار، گندا پانی اور ملبہ چھپا ہوتا ہے۔ بجلی کا جھٹکا اور انفیکشن حقیقی خطرات ہیں۔',
    },
    'q-fa-1': {
      question: 'شدید بیرونی خون بہنے پر پہلا قدم کیا ہے؟',
      options: ['فوراً ٹورنیکیٹ باندھیں', 'براہ راست مضبوط دباؤ ڈالیں', 'زخم کو اچھی طرح دھوئیں', 'اوپر اٹھا کر انتظار کریں'],
      explanation: 'براہ راست دباؤ زیادہ تر خون بہنا روک دیتا ہے۔ ٹورنیکیٹ صرف اس صورت میں جب دباؤ سے خون نہ رکے۔',
    },
    'q-fa-2': {
      question: 'کوئی شخص بے ہوش ہے مگر سانس معمول کے مطابق ہے۔ اسے کس حالت میں رکھیں؟',
      options: ['سیدھا پیٹھ کے بل', 'سیدھا بٹھا کر', 'پہلو پر ریکوری پوزیشن میں', 'ٹانگیں سر سے اوپر اٹھا کر'],
      explanation: 'ریکوری پوزیشن سانس کی نالی کھلی رکھتی ہے اور قے کی صورت میں دم گھٹنے سے بچاتی ہے۔',
    },
    'q-fa-3': {
      question: 'گرمی سے نڈھال ہونے کی پہلی علامت کیا ہے؟',
      options: ['گرم خشک جلد', 'زیادہ پسینہ اور چکر آنا', 'مکمل بے ہوشی', 'سست مگر مضبوط نبض'],
      explanation: 'زیادہ پسینہ اور چکر آنا گرمی سے نڈھال ہونے کی علامت ہے۔ گرم خشک جلد ہیٹ اسٹروک ظاہر کرتی ہے، جو طبی ایمرجنسی ہے۔',
    },
  },
};
