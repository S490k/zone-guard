export interface PreparednessItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface QuizQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const PREPAREDNESS_TASKS: PreparednessItem[] = [
  {
    id: 'task-contacts',
    title: 'Create Emergency Contact List',
    description: 'Add 3-5 emergency contacts',
    priority: 'high',
  },
  {
    id: 'task-go-bag',
    title: 'Prepare Go-Bag',
    description: 'Pack essential items (documents, cash, medications)',
    priority: 'high',
  },
  {
    id: 'task-meeting-point',
    title: 'Identify Safe Meeting Point',
    description: 'Choose a location to meet family members',
    priority: 'medium',
  },
  {
    id: 'task-procedures',
    title: 'Review Emergency Procedures',
    description: 'Read through earthquake/flood procedures',
    priority: 'medium',
  },
  {
    id: 'task-insurance',
    title: 'Update Insurance Information',
    description: 'Ensure your insurance details are current',
    priority: 'low',
  },
];

export const EMERGENCY_KIT_ITEMS: PreparednessItem[] = [
  { id: 'kit-water', title: 'Water', description: '3-day supply (4 litres per person per day)', priority: 'high' },
  { id: 'kit-food', title: 'Non-perishable Food', description: '3-day supply (high-calorie items)', priority: 'high' },
  { id: 'kit-first-aid', title: 'First Aid Kit', description: 'Bandages, medications, antiseptic', priority: 'high' },
  { id: 'kit-flashlight', title: 'Flashlight & Batteries', description: 'Extra batteries included', priority: 'high' },
  { id: 'kit-radio', title: 'Radio (Battery/Hand-crank)', description: 'For emergency broadcasts', priority: 'medium' },
  { id: 'kit-medications', title: 'Medications & Glasses', description: '7-day supply of prescription medications', priority: 'high' },
  { id: 'kit-documents', title: 'Documents & Cash', description: 'ID, insurance, cash in waterproof bag', priority: 'high' },
  { id: 'kit-hygiene', title: 'Personal Hygiene Items', description: 'Toiletries, feminine products, diapers', priority: 'medium' },
  { id: 'kit-charger', title: 'Phone Charger & Power Bank', description: 'Multiple charging options', priority: 'medium' },
  { id: 'kit-contact-card', title: 'Emergency Contact Card', description: 'Written copy of important numbers', priority: 'medium' },
];

export const QUIZ_TOPICS = ['Earthquake Safety', 'Flood Preparedness', 'First Aid Basics'] as const;

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-eq-1',
    topic: 'Earthquake Safety',
    question: 'What should you do the moment shaking starts indoors?',
    options: ['Run outside immediately', 'Drop, cover and hold on', 'Stand in a doorway', 'Take the lift downstairs'],
    correctIndex: 1,
    explanation: 'Most injuries come from falling objects. Drop, cover and hold on protects you where you are; running outside exposes you to falling debris.',
  },
  {
    id: 'q-eq-2',
    topic: 'Earthquake Safety',
    question: 'Where is the safest place to shelter inside a room?',
    options: ['Beside a window', 'Under a sturdy table', 'Against a tall bookshelf', 'In the centre of the room'],
    correctIndex: 1,
    explanation: 'A sturdy table shields you from falling debris. Windows shatter and tall furniture topples.',
  },
  {
    id: 'q-eq-3',
    topic: 'Earthquake Safety',
    question: 'After the shaking stops, what is the first thing to check?',
    options: ['Social media for news', 'Yourself and others for injuries', 'Whether the power is back', 'The structural damage outside'],
    correctIndex: 1,
    explanation: 'Injuries take priority. Aftershocks may follow, so assess people before property.',
  },
  {
    id: 'q-fl-1',
    topic: 'Flood Preparedness',
    question: 'How much moving water can sweep a car away?',
    options: ['About 30cm', 'About 1 metre', 'About 2 metres', 'Only water above roof height'],
    correctIndex: 0,
    explanation: 'Just 30cm of moving water can float most vehicles. Never drive through floodwater.',
  },
  {
    id: 'q-fl-2',
    topic: 'Flood Preparedness',
    question: 'An evacuation order is issued for your area. What do you do?',
    options: ['Wait to see if water reaches you', 'Leave immediately via the designated route', 'Move belongings upstairs first', 'Stay to protect your property'],
    correctIndex: 1,
    explanation: 'Evacuation orders account for conditions you cannot see. Delay removes your safe exit.',
  },
  {
    id: 'q-fl-3',
    topic: 'Flood Preparedness',
    question: 'Why should you avoid walking through standing floodwater?',
    options: ['It is merely uncomfortable', 'It may be electrically charged or contaminated', 'It slows you down', 'It damages footwear'],
    correctIndex: 1,
    explanation: 'Floodwater hides downed power lines, sewage and debris. Electrocution and infection are real risks.',
  },
  {
    id: 'q-fa-1',
    topic: 'First Aid Basics',
    question: 'What is the first step for severe external bleeding?',
    options: ['Apply a tourniquet immediately', 'Apply firm direct pressure', 'Rinse the wound thoroughly', 'Elevate and wait'],
    correctIndex: 1,
    explanation: 'Direct pressure controls most bleeding. A tourniquet is for limb bleeding that pressure cannot stop.',
  },
  {
    id: 'q-fa-2',
    topic: 'First Aid Basics',
    question: 'Someone is unresponsive but breathing normally. What position?',
    options: ['Flat on their back', 'Sitting upright', 'The recovery position on their side', 'Legs raised above the head'],
    correctIndex: 2,
    explanation: 'The recovery position keeps the airway clear and prevents choking if they vomit.',
  },
  {
    id: 'q-fa-3',
    topic: 'First Aid Basics',
    question: 'What is the first sign of heat exhaustion to watch for?',
    options: ['Hot dry skin', 'Heavy sweating with dizziness', 'Complete loss of consciousness', 'A slow, strong pulse'],
    correctIndex: 1,
    explanation: 'Heavy sweating with dizziness signals heat exhaustion. Hot dry skin indicates heatstroke, a medical emergency.',
  },
];
