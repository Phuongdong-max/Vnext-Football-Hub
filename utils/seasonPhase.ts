import { SeasonPhase } from '../types';

export interface SeasonPhaseInput {
    status?: 'active' | 'archived';
    startDate?: Date | null;
    endDate?: Date | null;
    /** Total fixtures in the season, when known. */
    matchCount?: number;
    /** Fixtures already played, when known. */
    playedCount?: number;
}

/**
 * Where a season sits in time.
 *
 * The start date decides it. A season that exists but has not kicked off yet is
 * "upcoming", not "ongoing" - the document gets created and the teams filled in
 * well before the first match.
 *
 * A start date is required when creating a season, so a season without one can
 * only be a historical record from before seasons had dates: those are treated
 * as finished rather than left claiming to be live forever.
 */
export const getSeasonPhase = (input: SeasonPhaseInput, now: Date = new Date()): SeasonPhase => {
    // An archive is a deliberate act by an admin and outranks the calendar.
    if (input.status === 'archived') return 'archived';

    const { startDate, endDate, matchCount, playedCount } = input;

    if (!startDate) return 'finished';

    if (now < startDate) return 'upcoming';
    if (endDate && now > endDate) return 'finished';

    // Started, and either no end date or the end has not arrived yet. Still
    // treat "every fixture played" as finished, so a season that wraps up early
    // does not sit on "ongoing" until its end date.
    if (matchCount && matchCount > 0 && playedCount === matchCount) return 'finished';
    return 'ongoing';
};

export const SEASON_PHASE_LABEL: Record<SeasonPhase, string> = {
    upcoming: 'season.phase.upcoming',
    ongoing: 'season.phase.ongoing',
    finished: 'season.phase.finished',
    archived: 'tournament.archivedBadge',
};

/** Whole days from now until the season opens; null when that is not meaningful. */
export const daysUntil = (date: Date | null | undefined, now: Date = new Date()): number | null => {
    if (!date) return null;
    const ms = date.getTime() - now.getTime();
    if (ms <= 0) return null;
    return Math.ceil(ms / 86400000);
};
