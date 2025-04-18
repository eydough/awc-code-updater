export interface MediaEntry {
  entryNum: string;
  mediaId: string;
  mediaType: 'anime' | 'manga';
  url: string;
  position: number;
  completed: boolean;
  startDate: string | null;
  finishDate: string | null;
}

// Legacy interface maintained for backward compatibility
export interface AnimeEntry extends Omit<MediaEntry, 'mediaId' | 'mediaType'> {
  animeId: string;
}

export interface CompletedMedia {
  title: string;
  mediaType: 'anime' | 'manga';
  startDate: string | null;
  finishDate: string | null;
}

// Legacy type maintained for backward compatibility
export type CompletedAnime = Omit<CompletedMedia, 'mediaType'>;

export interface ChallengeStats {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  finishDate: string | null;
  remainingMedia: string[];
}
