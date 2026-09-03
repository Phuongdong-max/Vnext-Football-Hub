


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { TeamDivisionData, DividedTeam, PlayerSeed, Player, UserRole, Tournament } from '../types';
import { onTeamDivisionUpdate, updateTeamDivision, onTournamentUpdate } from '../services/firebaseService';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { UsersIcon, ArrowPathIcon, PencilIcon, PlayIcon } from '../components/icons';
import {
    TeamDivisionSpinner, pickTargetTeam, assignToTeams, shuffled,
    buildEmptyTeams, teamDisplayName, teamHeaderColor, teamLogoSrc, TeamCrest, DrawTeam,
} from '../components/TeamDivisionSpinner';

interface TeamDividerPageProps {
    // Rendered as a tab of SeasonPage, which supplies the page heading.
    embedded?: boolean;
    /**
     * The wheel takes over the whole page, so the host is told to fold away its
     * season header and tab bar while a draw is running. The host owns that
     * chrome, so it cannot work this out on its own.
     */
    onImmersiveChange?: (immersive: boolean) => void;
}

export const TeamDividerPage: React.FC<TeamDividerPageProps> = ({ embedded = false, onImmersiveChange }) => {
    const { translate, language } = useLanguage();
    const { currentUser, isFirebaseReady, addToast, selectedTournament, selectedTournamentId } = useAppContext();

    // Only admins own the roster: they edit it and their division is the one
    // that gets published. Everyone else reads it and may spin locally.
    const isAdmin = currentUser?.role === UserRole.ADMIN;

    type DivisionState = 'idle' | 'spinning' | 'finished';

    const [divisionState, setDivisionState] = useState<DivisionState>('idle');
    const [playersToDivide, setPlayersToDivide] = useState<Player[]>([]);

    const [seedPlayers, setSeedPlayers] = useState({ GK: '', A: '', B: '', C: '', D: '', E: '' });
    const [numberOfTeams, setNumberOfTeams] = useState<number>(3);
    // The season's own teams. When it has some, the draw fills those instead of
    // inventing "Team 1..N": the number of boxes, their names and their colours
    // all come from the Teams tab.
    const [seasonTournament, setSeasonTournament] = useState<Tournament | null>(null);
    const [dividedTeams, setDividedTeams] = useState<DividedTeam[]>([]);
    const [lastUpdateInfo, setLastUpdateInfo] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingPlayers, setIsSavingPlayers] = useState(false);
    const [message, setMessage] = useState('');

    // Set while the admin has typed changes that are not written yet, so an
    // incoming snapshot does not wipe the edit in progress. Held in a ref too
    // because the snapshot callback closes over the value from subscribe time.
    // Shown once the draw lands, over everything, so a room watching the screen
    // gets a clear final result rather than the page quietly changing behind the
    // wheel. Dismissed by clicking anywhere.
    const [showResult, setShowResult] = useState(false);
    const [isEditingList, setIsEditingList] = useState(false);
    const [hasUnsavedPlayers, setHasUnsavedPlayers] = useState(false);
    const hasUnsavedPlayersRef = useRef(false);
    useEffect(() => { hasUnsavedPlayersRef.current = hasUnsavedPlayers; }, [hasUnsavedPlayers]);

    useEffect(() => {
        onImmersiveChange?.(divisionState === 'spinning');
    }, [divisionState, onImmersiveChange]);

    useEffect(() => {
        if (!showResult) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowResult(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showResult]);

    useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange]);

    const editSeedPlayers = (updater: (prev: typeof seedPlayers) => typeof seedPlayers) => {
        setSeedPlayers(updater);
        setHasUnsavedPlayers(true);
    };

    useEffect(() => {
        if (!isFirebaseReady) return;

        const unsubscribe = onTeamDivisionUpdate((data) => {
            if (data) {
                if (!hasUnsavedPlayersRef.current) {
                    setSeedPlayers({
                        GK: data.seedPlayers.GK || '',
                        A: data.seedPlayers.A || '',
                        B: data.seedPlayers.B || '',
                        C: data.seedPlayers.C || '',
                        D: data.seedPlayers.D || '',
                        E: data.seedPlayers.E || '',
                    });
                }
                if (data.dividedTeams && data.dividedTeams.length > 0) {
                    setDividedTeams(data.dividedTeams);
                    setNumberOfTeams(data.dividedTeams.length);
                    setDivisionState('finished');
                }
                
                if (data.lastUpdated && data.updatedBy) {
                    const date = new Date(data.lastUpdated);
                    setLastUpdateInfo(translate('teamDivider.lastUpdated', {
                        name: data.updatedBy.name,
                        date: date.toLocaleString(language),
                    }));
                } else {
                    setLastUpdateInfo(translate('teamDivider.lastUpdated.never'));
                }
            } else {
                setLastUpdateInfo(translate('teamDivider.lastUpdated.never'));
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isFirebaseReady, translate, language]);

    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setSeasonTournament(null);
            return;
        }
        const unsubscribe = onTournamentUpdate(selectedTournamentId, setSeasonTournament);
        return () => unsubscribe();
    }, [isFirebaseReady, selectedTournamentId]);

    // Only named teams count - a half-created row in the Teams tab should not
    // become a blank box on the wheel.
    const seasonTeams: DrawTeam[] = (seasonTournament?.teams ?? [])
        .filter(t => t?.name?.trim())
        .map(t => ({ id: t.id, name: t.name.trim(), color: t.color ?? null, logoUrl: t.logoUrl ?? null }));

    // With two or more real teams the count is not the admin's to choose: the
    // draw has to land in exactly the teams the season plays with.
    const usesSeasonTeams = seasonTeams.length >= 2;
    const effectiveTeamCount = usesSeasonTeams ? seasonTeams.length : numberOfTeams;

    /**
     * Names shown for a saved division. A team renamed in the Teams tab after
     * the draw should read with its new name, so the live team wins over the
     * name frozen into the stored result.
     */
    const liveTeam = (team: DividedTeam): DividedTeam => {
        const source = team.sourceTeamId ? seasonTeams.find(t => t.id === team.sourceTeamId) : undefined;
        return source ? { ...team, name: source.name, color: source.color ?? null, logoUrl: source.logoUrl ?? null } : team;
    };

    /**
     * Reads the six lists into players and validates the draw. Shared by both
     * buttons so "spin" and "divide now" can never disagree about who is in, or
     * about what counts as a valid setup. Returns null when the draw cannot run,
     * after setting the message.
     */
    const collectPlayers = (): Player[] | null => {
        setMessage('');

        if (effectiveTeamCount < 2) {
            setMessage(translate('teamDivider.message.minPlayersToSplit', { count: 2 }));
            return null;
        }

        const processTextarea = (text: string, seed: PlayerSeed): Player[] =>
            text
                .split("\n")
                .map(name => name.trim())
                .filter(name => name !== "")
                .map(name => ({ name, seed }));

        const allPlayers = shuffled([
            ...processTextarea(seedPlayers.GK, 'GK'),
            ...processTextarea(seedPlayers.A, "A"),
            ...processTextarea(seedPlayers.B, "B"),
            ...processTextarea(seedPlayers.C, "C"),
            ...processTextarea(seedPlayers.D, "D"),
            ...processTextarea(seedPlayers.E, "E")
        ]);

        if (allPlayers.length === 0) {
            setMessage(translate('teamDivider.message.atLeastOnePlayer'));
            return null;
        }

        if (allPlayers.length < effectiveTeamCount) {
            setMessage(translate('teamDivider.message.minPlayersToSplit', { count: effectiveTeamCount }));
            return null;
        }

        return allPlayers;
    };

    const handlePrepareAndStartDivision = () => {
        const allPlayers = collectPlayers();
        if (!allPlayers) return;
        setPlayersToDivide(allPlayers);
        setDividedTeams([]);
        setDivisionState('spinning');
    };

    const handleSavePlayers = async () => {
        if (!isAdmin) return;
        setMessage('');
        setIsSavingPlayers(true);
        try {
            await updateTeamDivision({ seedPlayers }, currentUser);
            setHasUnsavedPlayers(false);
            addToast('teamDivider.message.playersSaved', 'success');
        } catch (error) {
            console.error(error);
            addToast('teamDivider.message.playersSaveError', 'error');
        } finally {
            setIsSavingPlayers(false);
        }
    };

    const handleDivisionComplete = async (finalTeams: DividedTeam[]) => {
        setDividedTeams(finalTeams);
        setDivisionState('finished');
        setShowResult(true);

        // Non-admins can spin to preview a split, but only an admin's result is
        // published to everyone.
        if (!isAdmin) {
            addToast('teamDivider.message.resultNotSaved', 'info');
            return;
        }

        setIsSaving(true);
        try {
            await updateTeamDivision({ seedPlayers, dividedTeams: finalTeams }, currentUser);
            setHasUnsavedPlayers(false);
            addToast('teamDivider.message.saveSuccess', 'success');
        } catch (error) {
            console.error(error);
            addToast('teamDivider.message.saveError', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // "Divide now" runs the identical rule the wheel uses - the helpers are
    // imported from the spinner rather than reimplemented here.
    const handleInstantDivide = () => {
        const allPlayers = collectPlayers();
        if (!allPlayers) return;

        let teams: DividedTeam[] = buildEmptyTeams(effectiveTeamCount, seasonTeams);
        let fallbackCount = 0;
        shuffled(allPlayers).forEach(player => {
            const { team, usedFallback } = pickTargetTeam(player, teams);
            if (usedFallback && player.seed !== 'GK') fallbackCount += 1;
            teams = assignToTeams(teams, player, team.id);
        });
        if (fallbackCount > 0) {
            addToast('teamDivider.spinner.unbalancedSummary', 'warning', { count: fallbackCount });
        }
        handleDivisionComplete(teams);
    };

    const textareaBaseClasses = "w-full p-3 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-background dark:bg-slate-800 border border-border dark:border-slate-700 text-textPrimary placeholder-gray-400 dark:placeholder-slate-400 custom-scrollbar-thin";
    const seedOrder: PlayerSeed[] = ['GK', 'A', 'B', 'C', 'D', 'E'];
    const namesOf = (seed: PlayerSeed) =>
        seedPlayers[seed].split('\n').map(n => n.trim()).filter(Boolean);
    const totalEntered = seedOrder.reduce((sum, s) => sum + namesOf(s).length, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" />
                <p className="ml-3 text-textSecondary">{translate('teamDivider.loading')}</p>
            </div>
        );
    }

    if (divisionState === 'spinning') {
        return (
            <TeamDivisionSpinner
                players={playersToDivide}
                numberOfTeams={effectiveTeamCount}
                seasonTeams={seasonTeams}
                onComplete={handleDivisionComplete}
                onCancel={() => setDivisionState('idle')}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Result takeover: the whole draw exists to produce this, so it gets
                the full screen for a moment before the page goes back to normal. */}
            {showResult && dividedTeams.length > 0 && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={translate('teamDivider.result.title')}
                    onClick={() => setShowResult(false)}
                    className="tds-result-overlay fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm sm:p-8"
                >
                    <div className="tds-result-card w-full max-w-6xl">
                        <div className="mb-6 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                                {translate('teamDivider.result.title')}
                            </p>
                            <h2 className="mt-2 text-3xl font-extrabold text-white drop-shadow sm:text-5xl">
                                {selectedTournament?.name ?? translate('teamDivider.title')}
                            </h2>
                        </div>

                        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                            {dividedTeams.map(liveTeam).map(team => (
                                <div key={team.id} className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-2xl">
                                    <div
                                        className="flex items-center justify-between gap-2 px-4 py-2.5"
                                        style={{ backgroundColor: teamHeaderColor(team) }}
                                    >
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <TeamCrest src={teamLogoSrc(team)} name={teamDisplayName(team, translate)} className="h-9 w-9" />
                                            <h3 className="break-words font-bold text-white">{teamDisplayName(team, translate)}</h3>
                                        </div>
                                        <span className="flex-shrink-0 font-mono text-xs text-white/80">{team.playerCount}</span>
                                    </div>
                                    <ul className="flex-grow divide-y divide-border">
                                        {team.players.map((player, i) => (
                                            <li key={`${player.name}-${team.id}-${i}`} className="flex items-center justify-between gap-2 px-4 py-2">
                                                <span className="break-words font-semibold text-textPrimary">{player.name}</span>
                                                <span className="flex-shrink-0 font-mono text-[11px] text-textSecondary">{player.seed}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="border-t border-border px-4 py-1.5 text-center text-[11px] text-textSecondary">
                                        {translate('teamDivider.totalSeedValue')}:{' '}
                                        <span className="font-semibold text-primary">{team.totalSeedValue}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mt-6 text-center text-sm text-white/60">
                            {translate('teamDivider.result.dismissHint')}
                        </p>
                    </div>
                </div>
            )}

            {!embedded && (
                <header className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-textPrimary">{translate('teamDivider.title')}</h1>
                    <p className="mt-1 text-textSecondary">{translate('teamDivider.subtitle')}</p>
                </header>
            )}

            {/* The entered squad is always on screen. Editing it used to replace
                this view with six textareas; now it is a mode you switch into. */}
            <section className="overflow-hidden rounded-xl bg-surface shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-lg font-semibold text-textPrimary">{translate('teamDivider.rosterTitle')}</h2>
                        <span className="text-sm text-textSecondary">
                            {translate('teamDivider.enteredCount', { count: totalEntered })}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isAdmin ? (
                            isEditingList ? (
                                <>
                                    {hasUnsavedPlayers && (
                                        <span className="text-xs font-medium text-warning">
                                            {translate('teamDivider.unsavedIndicator')}
                                        </span>
                                    )}
                                    <Button
                                        onClick={async () => { await handleSavePlayers(); setIsEditingList(false); }}
                                        disabled={isSavingPlayers}
                                        size="sm"
                                    >
                                        {isSavingPlayers ? <LoadingSpinner size="sm" /> : translate('teamDivider.savePlayersButton')}
                                    </Button>
                                    <Button onClick={() => setIsEditingList(false)} variant="secondary" size="sm">
                                        {translate('common.button.cancel')}
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={() => setIsEditingList(true)} variant="outline" size="sm">
                                    <PencilIcon className="mr-1.5 h-4 w-4" />
                                    {translate('teamDivider.editListButton')}
                                </Button>
                            )
                        ) : (
                            <span className="text-xs italic text-textSecondary">{translate('teamDivider.rosterAdminOnly')}</span>
                        )}
                    </div>
                </div>

                <div className="p-4">
                    {isEditingList && isAdmin ? (
                        // Same six-column grid as the read view, so switching into
                        // edit mode does not resize the panel and shove everything
                        // below it down the page.
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            {seedOrder.map(seed => (
                                <div key={seed} className="flex h-60 flex-col">
                                    <label htmlFor={`seed${seed}`} className="mb-1 block text-sm font-medium text-textPrimary">
                                        {translate(`teamDivider.seed${seed}`)}
                                    </label>
                                    <textarea
                                        id={`seed${seed}`}
                                        value={seedPlayers[seed]}
                                        onChange={(e) => editSeedPlayers(prev => ({ ...prev, [seed]: e.target.value }))}
                                        className={`${textareaBaseClasses} min-h-0 flex-1 resize-none`}
                                        placeholder={translate('teamDivider.playerPlaceholder')}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : totalEntered === 0 ? (
                        // Same height as a grid row, so the panel does not resize
                        // when the first names are entered either.
                        <div className="flex h-60 items-center justify-center">
                            <p className="text-textSecondary">{translate('teamDivider.noPlayersYet')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            {seedOrder.map(seed => {
                                const names = namesOf(seed);
                                return (
                                    <div key={seed} className="flex h-60 flex-col rounded-lg border border-border bg-background p-3 dark:bg-slate-800/60">
                                        <h3 className="mb-2 flex flex-shrink-0 items-baseline justify-between border-b border-border pb-2">
                                            <span className="text-sm font-semibold text-textPrimary">
                                                {translate(`teamDivider.seed${seed}`)}
                                            </span>
                                            <span className="font-mono text-xs text-textSecondary">{names.length}</span>
                                        </h3>
                                        {names.length > 0 ? (
                                            <ol className="custom-scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                                                {names.map((name, i) => (
                                                    // break-words, not truncate: a full name matters more
                                                    // than a tidy single line.
                                                    <li key={`${seed}-${i}`} className="flex gap-2 text-sm text-textPrimary">
                                                        <span className="w-4 flex-shrink-0 text-right font-mono text-xs text-textSecondary">{i + 1}</span>
                                                        <span className="break-words">{name}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <p className="text-xs italic text-textSecondary">{translate('teamDivider.noPlayersYet')}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="border-t border-border bg-background p-4 dark:bg-slate-800/40">
                    <div className="flex flex-wrap items-end justify-center gap-4">
                        <div>
                            <label htmlFor="numberOfTeams" className="mb-1 block text-center text-xs font-semibold uppercase tracking-wide text-textSecondary">
                                {translate('teamDivider.numberOfTeamsLabel')}
                            </label>
                            {usesSeasonTeams ? (
                                // Not editable: the draw lands in the season's own teams,
                                // so the count is whatever the Teams tab says.
                                <div
                                    id="numberOfTeams"
                                    className="flex h-[42px] w-24 items-center justify-center rounded-md border border-border bg-black/[0.03] text-lg font-bold text-textPrimary dark:bg-white/5"
                                    title={translate('teamDivider.teamsFromSeason', { count: seasonTeams.length })}
                                >
                                    {seasonTeams.length}
                                </div>
                            ) : (
                                <input
                                    id="numberOfTeams"
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={numberOfTeams || ''}
                                    onChange={e => setNumberOfTeams(Number(e.target.value))}
                                    onBlur={() => { if (numberOfTeams < 2) setNumberOfTeams(2); }}
                                    className="w-24 rounded-md border border-border bg-surface p-2 text-center text-textPrimary shadow-sm focus:border-primary focus:ring-2 focus:ring-primary dark:bg-slate-700"
                                />
                            )}
                        </div>
                        <Button
                            onClick={handlePrepareAndStartDivision}
                            disabled={isSaving || effectiveTeamCount < 2 || totalEntered === 0}
                            size="lg"
                            className="h-[42px]"
                        >
                            <PlayIcon className="mr-2 h-5 w-5" />
                            {translate('teamDivider.spinDivideButton')}
                        </Button>
                        <Button
                            onClick={handleInstantDivide}
                            disabled={isSaving || effectiveTeamCount < 2 || totalEntered === 0}
                            variant="outline"
                            size="lg"
                            className="h-[42px]"
                        >
                            <UsersIcon className="mr-2 h-5 w-5" />
                            {isSaving ? translate('teamDivider.message.saving') : translate('teamDivider.divideButton')}
                        </Button>
                    </div>

                    {/* Say where the teams come from, and show them: otherwise a
                        locked number box looks like a bug. */}
                    {usesSeasonTeams ? (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
                            <span className="text-xs text-textSecondary">
                                {translate('teamDivider.teamsFromSeason', { count: seasonTeams.length })}
                            </span>
                            {seasonTeams.map(team => {
                                const logo = teamLogoSrc(team);
                                return (
                                    <span
                                        key={team.id}
                                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-1 pr-2.5 text-xs font-semibold text-textPrimary"
                                    >
                                        {/* The crest identifies the team on its own; the colour
                                            dot only stands in when there is no crest. */}
                                        {logo ? (
                                            <TeamCrest src={logo} name={team.name} className="h-5 w-5" />
                                        ) : (
                                            <span
                                                className="ml-1 h-2 w-2 flex-shrink-0 rounded-full"
                                                style={{ backgroundColor: team.color || '#64748b' }}
                                            />
                                        )}
                                        {team.name}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mt-3 text-center text-xs text-textSecondary">
                            {translate('teamDivider.noSeasonTeamsHint')}
                        </p>
                    )}
                </div>

                {message && <p className="border-t border-border p-3 text-center text-danger">{message}</p>}
            </section>

            {/* Result */}
            <section>
                <div className="mb-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-textPrimary">{translate('teamDivider.resultsTitle')}</h2>
                        {lastUpdateInfo && <p className="mt-0.5 text-xs text-textSecondary">{lastUpdateInfo}</p>}
                    </div>
                    {divisionState === 'finished' && dividedTeams.length > 0 && (
                        <Button onClick={() => setDivisionState('idle')} variant="outline" size="sm">
                            <ArrowPathIcon className="mr-2 h-4 w-4" />
                            {translate('teamDivider.newDivisionButton')}
                        </Button>
                    )}
                </div>

                {dividedTeams.length > 0 ? (
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                        {dividedTeams.map(liveTeam).map(team => (
                            <div key={team.id} id={`team-box-${team.id}`} className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-lg">
                                <div
                                    className="flex items-center justify-between gap-2 px-4 py-2.5"
                                    style={{ backgroundColor: teamHeaderColor(team) }}
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <TeamCrest src={teamLogoSrc(team)} name={teamDisplayName(team, translate)} className="h-8 w-8" />
                                        <h3 className="break-words font-bold text-white">{teamDisplayName(team, translate)}</h3>
                                    </div>
                                    <span className="flex-shrink-0 text-xs font-medium text-white/80">
                                        {translate('teamDivider.playerCount')}: {team.playerCount}
                                    </span>
                                </div>
                                <ul className="flex-grow divide-y divide-border">
                                    {team.players.map((player, i) => (
                                        <li key={`${player.name}-${team.id}-${i}`} className="flex items-center justify-between gap-2 px-4 py-2">
                                            <span className="break-words font-medium text-textPrimary">{player.name}</span>
                                            <span className="flex-shrink-0 rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-textSecondary dark:bg-white/10">
                                                {player.seed}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="border-t border-border px-4 py-2 text-xs text-textSecondary">
                                    {translate('teamDivider.totalSeedValue')}:{' '}
                                    <span className="font-semibold text-primary">{team.totalSeedValue}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl bg-surface p-10 text-center shadow">
                        <UsersIcon className="mx-auto h-12 w-12 text-textSecondary/25" />
                        <p className="mt-3 text-textSecondary">{translate('teamDivider.noPlayers')}</p>
                    </div>
                )}
            </section>
        </div>
    );
};
