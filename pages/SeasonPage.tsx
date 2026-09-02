import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate } from '../services/firebaseService';
import { Tournament } from '../types';
import { getSeasonPhase, SEASON_PHASE_LABEL, daysUntil } from '../utils/seasonPhase';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import {
    TableCellsIcon, CalendarIcon, UsersIcon, StarIcon,
    UserCircleIcon, ArrowsRightLeftIcon, TrophyIcon, ArchiveBoxIcon,
} from '../components/icons';
import { CreateSeasonButton } from '../components/Admin/CreateSeasonButton';
import { TournamentPage } from './TournamentPage';
import { PlayerInfoPage } from './PlayerInfoPage';
import { TeamDividerPage } from './TeamDividerPage';

// The season is the app's main axis: you land on the current one and everything
// below - table, fixtures, squads, the draw - belongs to it. Switching seasons
// in the picker switches all of it at once.
type SeasonTabId = 'standings' | 'schedule' | 'teams' | 'topScorers' | 'players' | 'divider';

const TABS: { id: SeasonTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'standings',  label: 'tournament.tab.standings',  icon: <TableCellsIcon className="h-5 w-5" /> },
    { id: 'schedule',   label: 'tournament.tab.schedule',   icon: <CalendarIcon className="h-5 w-5" /> },
    { id: 'teams',      label: 'tournament.tab.teams',      icon: <UsersIcon className="h-5 w-5" /> },
    { id: 'topScorers', label: 'tournament.tab.topScorers', icon: <StarIcon className="h-5 w-5" /> },
    { id: 'players',    label: 'season.tab.players',        icon: <UserCircleIcon className="h-5 w-5" /> },
    { id: 'divider',    label: 'season.tab.divider',        icon: <ArrowsRightLeftIcon className="h-5 w-5" /> },
];

export const SeasonPage: React.FC = () => {
    const { translate, language } = useLanguage();
    const {
        tournaments, selectedTournamentId, selectedTournament, selectTournament,
        isTournamentListLoading, isSelectedTournamentArchived, isFirebaseReady,
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<SeasonTabId>('standings');
    // A tab can ask for the whole page: the team draw hides the season header
    // and tabs while the wheel is running.
    const [isImmersive, setIsImmersive] = useState(false);
    // Read only for the hero summary. TournamentPage keeps its own subscription
    // for the panels; the Firestore SDK shares one listener per document.
    const [tournament, setTournament] = useState<Tournament | null>(null);

    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setTournament(null);
            return;
        }
        const unsubscribe = onTournamentUpdate(selectedTournamentId, setTournament);
        return () => unsubscribe();
    }, [isFirebaseReady, selectedTournamentId]);

    if (isTournamentListLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-textSecondary">{translate('tournament.loading')}</span>
            </div>
        );
    }

    if (!selectedTournamentId) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl bg-surface p-10 text-center shadow-lg">
                <TrophyIcon className="mx-auto h-14 w-14 text-textSecondary/40" />
                <h1 className="mt-4 text-2xl font-bold text-textPrimary">{translate('season.empty.title')}</h1>
                <p className="mt-2 text-textSecondary">{translate('season.empty.body')}</p>
            </div>
        );
    }

    const matches = tournament?.schedule ?? [];
    const playedCount = matches.filter(m => m.status === 'finished').length;

    // "Ongoing" has to be earned by the calendar. A season can exist, have teams
    // and a full fixture list weeks before the first kickoff.
    const phase = getSeasonPhase({
        status: selectedTournament?.status,
        startDate: tournament?.startDate ?? selectedTournament?.startDate ?? null,
        endDate: tournament?.endDate ?? selectedTournament?.endDate ?? null,
        matchCount: matches.length,
        playedCount,
    });
    const startsIn = phase === 'upcoming'
        ? daysUntil(tournament?.startDate ?? selectedTournament?.startDate ?? null)
        : null;

    const PHASE_STYLE: Record<string, string> = {
        upcoming: 'bg-white/20 text-white backdrop-blur-sm',
        ongoing: 'bg-white/20 text-white backdrop-blur-sm',
        finished: 'bg-black/25 text-white',
        archived: 'bg-black/25 text-white',
    };
    const PHASE_DOT: Record<string, string> = {
        upcoming: 'bg-sky-300',
        ongoing: 'bg-green-300',
        finished: 'bg-white/60',
        archived: 'bg-white/60',
    };

    return (
        <div className="space-y-6">
            {/* Hero: the season identity, and the way to another one. */}
            {!isImmersive && <section className="overflow-hidden rounded-2xl shadow-xl">
                <div className="bg-gradient-to-br from-primary via-orange-500 to-amber-500 px-5 py-6 sm:px-8 sm:py-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedTournament?.season && (
                                    <span className="rounded-md bg-white/20 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">
                                        {selectedTournament.season}
                                    </span>
                                )}
                                <span className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${PHASE_STYLE[phase]}`}>
                                    {phase === 'archived'
                                        ? <ArchiveBoxIcon className="h-3.5 w-3.5" />
                                        : <span className={`h-1.5 w-1.5 rounded-full ${PHASE_DOT[phase]}`} />}
                                    {translate(SEASON_PHASE_LABEL[phase])}
                                </span>
                                {startsIn !== null && (
                                    <span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                                        {translate('season.startsIn', { days: startsIn })}
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl">
                                {selectedTournament?.name}
                            </h1>

                            {tournament?.lastUpdated && tournament.updatedBy && (
                                <p className="mt-2 text-xs text-white/75">
                                    {translate('tournament.lastUpdated', {
                                        name: tournament.updatedBy.name,
                                        date: new Date(tournament.lastUpdated).toLocaleString(language),
                                    })}
                                </p>
                            )}
                        </div>

                        <div className="flex-shrink-0">
                            <label htmlFor="season-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/80">
                                {translate('season.switch')}
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                            <select
                                id="season-select"
                                value={selectedTournamentId}
                                onChange={e => selectTournament(e.target.value)}
                                className="w-full min-w-[16rem] rounded-lg border-0 bg-white/95 px-3 py-2.5 text-sm font-medium text-slate-800 shadow-md focus:outline-none focus:ring-2 focus:ring-white lg:w-auto"
                            >
                                {tournaments.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.season ? `${t.season} - ` : ''}{t.name}
                                        {t.status === 'archived' ? ` (${translate('tournament.archivedSuffix')})` : ''}
                                    </option>
                                ))}
                            </select>
                            {/* Renders nothing for non-admins. */}
                            <CreateSeasonButton appearance="hero" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* One tab bar for the whole season, replacing the old top-level menu. */}
                <nav
                    aria-label={translate('season.tabsLabel')}
                    className="flex overflow-x-auto bg-surface px-2 shadow-inner sm:px-4"
                >
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                                    isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-textSecondary hover:border-border hover:text-textPrimary'
                                }`}
                            >
                                {tab.icon}
                                <span>{translate(tab.label)}</span>
                            </button>
                        );
                    })}
                </nav>
            </section>}

            {/* Panels are the existing pages, embedded so they drop their own
                headers and pickers and inherit this shell's season. */}
            {activeTab === 'players' ? (
                <PlayerInfoPage embedded />
            ) : activeTab === 'divider' ? (
                <TeamDividerPage embedded onImmersiveChange={setIsImmersive} />
            ) : (
                <TournamentPage embeddedTab={activeTab} />
            )}
        </div>
    );
};
