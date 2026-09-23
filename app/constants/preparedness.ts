/**
 * Structural definitions only. All display text lives in `app/i18n/content.ts`,
 * keyed by the ids below, so adding a language never means editing this file.
 */

export interface PreparednessItem {
  id: string;
  priority: 'low' | 'medium' | 'high';
}

export type QuizTopicId = 'earthquake' | 'flood' | 'firstAid';

export interface QuizQuestion {
  id: string;
  topic: QuizTopicId;
  correctIndex: number;
}

export const PREPAREDNESS_TASKS: PreparednessItem[] = [
  { id: 'task-contacts', priority: 'high' },
  { id: 'task-go-bag', priority: 'high' },
  { id: 'task-meeting-point', priority: 'medium' },
  { id: 'task-procedures', priority: 'medium' },
  { id: 'task-insurance', priority: 'low' },
];

export const EMERGENCY_KIT_ITEMS: PreparednessItem[] = [
  { id: 'kit-water', priority: 'high' },
  { id: 'kit-food', priority: 'high' },
  { id: 'kit-first-aid', priority: 'high' },
  { id: 'kit-flashlight', priority: 'high' },
  { id: 'kit-radio', priority: 'medium' },
  { id: 'kit-medications', priority: 'high' },
  { id: 'kit-documents', priority: 'high' },
  { id: 'kit-hygiene', priority: 'medium' },
  { id: 'kit-charger', priority: 'medium' },
  { id: 'kit-contact-card', priority: 'medium' },
];

export const QUIZ_TOPICS: QuizTopicId[] = ['earthquake', 'flood', 'firstAid'];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 'q-eq-1', topic: 'earthquake', correctIndex: 1 },
  { id: 'q-eq-2', topic: 'earthquake', correctIndex: 1 },
  { id: 'q-eq-3', topic: 'earthquake', correctIndex: 1 },
  { id: 'q-fl-1', topic: 'flood', correctIndex: 0 },
  { id: 'q-fl-2', topic: 'flood', correctIndex: 1 },
  { id: 'q-fl-3', topic: 'flood', correctIndex: 1 },
  { id: 'q-fa-1', topic: 'firstAid', correctIndex: 1 },
  { id: 'q-fa-2', topic: 'firstAid', correctIndex: 2 },
  { id: 'q-fa-3', topic: 'firstAid', correctIndex: 1 },
];
