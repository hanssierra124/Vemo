import { Emotion } from './emotion.model';

export interface MoodSummaryItem {
  emotion: Emotion;
  count: number;
}

export interface MoodSummary {
  total: number;
  items: MoodSummaryItem[];
}
