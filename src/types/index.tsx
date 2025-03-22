export interface AnimeEntry {
  entryNum: string;
  animeId: string;
  url: string;
  position: number;
  completed: boolean;
  startDate: string | null;
  finishDate: string | null;
}

export interface CompletedAnime {
  title: string;
  startDate: string | null;
  finishDate: string | null;
}

export interface ChallengeStats {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  finishDate: string | null;
  remainingAnime: string[];
}
