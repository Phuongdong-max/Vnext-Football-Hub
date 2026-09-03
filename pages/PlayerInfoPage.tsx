import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TournamentPlayer, PlayerSkills, Tournament, TournamentTeam } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { Button } from '../components/shared/Button';
import { PlusIcon, PencilIcon, TrashIcon, UserCircleIcon, StarIcon, CalendarIcon } from '../components/icons';
import {
    onAllPlayersUpdate,
    onTournamentUpdate,
    addPlayer,
    updatePlayer,
    deletePlayer as performDeletePlayer
} from '../services/firebaseService';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { PlayerSkillChart } from '../components/Tournament/PlayerSkillChart';
import { TeamCrest, teamLogoSrc } from '../components/TeamDivisionSpinner';
import { fileToTeamLogo, TeamLogoError, LogoErrorCode, AVATAR_SIZE, MAX_AVATAR_BYTES } from '../utils/teamLogo';

const AVATAR_ERROR_KEY: Record<LogoErrorCode, string> = {
    notImage: 'teamLogo.error.notImage',
    sourceTooBig: 'teamLogo.error.sourceTooBig',
    decodeFailed: 'teamLogo.error.decodeFailed',
    tooBig: 'teamLogo.error.tooBig',
};

/** What the season knows about a player beyond their own document. */
interface PlayerMeta {
    team: TournamentTeam | null;
    played: number;
    goals: number;
}

const defaultSkills: PlayerSkills = {
    speed: 50, shooting: 50, passing: 50,
    dribbling: 50, defending: 50, physical: 50
};

interface PlayerInfoPageProps {
    // Rendered as a tab of SeasonPage: that shell already shows the season name
    // and picker, so this page drops its own header.
    embedded?: boolean;
}

export const PlayerInfoPage: React.FC<PlayerInfoPageProps> = ({ embedded = false }) => {
    const { translate } = useLanguage();
    const {
        addToast, isFirebaseReady, isAdmin, canEdit: canEditRaw,
        selectedTournamentId, tournaments, selectTournament,
        isTournamentListLoading, isSelectedTournamentArchived,
    } = useAppContext();
    // Two different jobs, two different bars.
    //
    // Filling in a player's details - name, shirt number, photo, bio, ratings -
    // is day-to-day upkeep, so any signed-in editor may do it. Adding someone to
    // the squad or removing them changes who is in the season at all, and stays
    // with the admin. An archived season is frozen for everyone.
    const canEditPlayers = canEditRaw && !isSelectedTournamentArchived;
    const canManagePlayers = isAdmin && !isSelectedTournamentArchived;
    const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isAdding, setIsAdding] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerJersey, setNewPlayerJersey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayer | null>(null);
    const [editedPlayer, setEditedPlayer] = useState<TournamentPlayer | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isReadingAvatar, setIsReadingAvatar] = useState(false);

    // Teams and fixtures come from the season document. A player card that shows
    // only ratings says nothing about the season the player is actually in.
    const [tournament, setTournament] = useState<Tournament | null>(null);

    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setAllPlayers([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        // Clear the open player when switching seasons: the same person can
        // exist in two seasons as two separate documents.
        setSelectedPlayer(null);
        setEditedPlayer(null);
        setIsEditing(false);
        const unsubscribe = onAllPlayersUpdate(selectedTournamentId, (players) => {
            setAllPlayers(players);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isFirebaseReady, selectedTournamentId]);

    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setTournament(null);
            return;
        }
        const unsubscribe = onTournamentUpdate(selectedTournamentId, setTournament);
        return () => unsubscribe();
    }, [isFirebaseReady, selectedTournamentId]);

    /**
     * Squad, appearances and goals, worked out once for the whole roster rather
     * than per rendered card. A player's appearances are their team's finished
     * fixtures - the schedule records results, not line-ups, so this is the
     * closest honest number available.
     */
    const playerMeta = useMemo(() => {
        const meta = new Map<string, PlayerMeta>();
        const teams = tournament?.teams ?? [];
        const schedule = tournament?.schedule ?? [];

        const playedByTeam = new Map<string, number>();
        const goalsByPlayer = new Map<string, number>();

        schedule.forEach(match => {
            if (match.status !== 'finished') return;
            [match.homeTeamId, match.awayTeamId].forEach(teamId => {
                playedByTeam.set(teamId, (playedByTeam.get(teamId) ?? 0) + 1);
            });
            [...(match.homeTeamGoals ?? []), ...(match.awayTeamGoals ?? [])].forEach(goal => {
                // Guests are recorded by name only and have no player document.
                if (!goal.scorerId) return;
                goalsByPlayer.set(goal.scorerId, (goalsByPlayer.get(goal.scorerId) ?? 0) + 1);
            });
        });

        teams.forEach(team => {
            (team.members ?? []).forEach(({ playerId }) => {
                meta.set(playerId, {
                    team,
                    played: playedByTeam.get(team.id) ?? 0,
                    goals: goalsByPlayer.get(playerId) ?? 0,
                });
            });
        });

        // A player not on any team still has goals if they scored as a guest.
        goalsByPlayer.forEach((goals, playerId) => {
            if (!meta.has(playerId)) meta.set(playerId, { team: null, played: 0, goals });
        });

        return meta;
    }, [tournament]);

    const metaFor = (playerId?: string): PlayerMeta =>
        (playerId && playerMeta.get(playerId)) || { team: null, played: 0, goals: 0 };

    const handleAvatarFile = async (file?: File | null) => {
        if (!file || !canEditPlayers) return;
        setIsReadingAvatar(true);
        try {
            const avatarUrl = await fileToTeamLogo(file, { size: AVATAR_SIZE, maxBytes: MAX_AVATAR_BYTES });
            setEditedPlayer(prev => prev ? { ...prev, avatarUrl } : prev);
        } catch (error) {
            const code = error instanceof TeamLogoError ? error.code : 'decodeFailed';
            addToast(AVATAR_ERROR_KEY[code], 'error');
        } finally {
            setIsReadingAvatar(false);
            // Let the same file be chosen again after a failure.
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const handleSelectPlayer = (player: TournamentPlayer) => {
        setSelectedPlayer(player);
        setEditedPlayer({ ...player, skills: player.skills || defaultSkills });
        setIsEditing(false);
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        // preventDefault first: bailing out before it would let the form submit
        // for real and reload the page.
        e.preventDefault();
        if (!canManagePlayers) return;
        const name = newPlayerName.trim();
        const jersey = parseInt(newPlayerJersey, 10);
        if (name && !isNaN(jersey)) {
             try {
                await addPlayer(selectedTournamentId!, { name, jerseyNumber: jersey });
                addToast('playerInfo.playerAddedSuccess', 'success');
                setIsAdding(false);
                setNewPlayerName('');
                setNewPlayerJersey('');
            } catch (error) {
                addToast('playerInfo.playerAddedError', 'error', { message: (error as Error).message });
            }
        }
    };
    
    const handleSaveChanges = async () => {
        if (!canEditPlayers || !editedPlayer) return;
        setIsSaving(true);
        try {
            const { id, ...dataToUpdate } = editedPlayer;
            await updatePlayer(selectedTournamentId!, id, dataToUpdate);
            addToast('playerInfo.playerUpdatedSuccess', 'success');
            // Update the selected player state to reflect changes immediately
            setSelectedPlayer(editedPlayer);
            setIsEditing(false);
        } catch (error) {
            addToast('playerInfo.playerUpdatedError', 'error', { message: (error as Error).message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlayer = async () => {
        if (!canManagePlayers || !selectedPlayer) return;
        if (!window.confirm(translate('manageTournament.players.deleteConfirm'))) return;
        try {
            await performDeletePlayer(selectedTournamentId!, selectedPlayer.id);
            addToast('playerInfo.playerDeletedSuccess', 'success');
            setSelectedPlayer(null);
            setEditedPlayer(null);
            setIsEditing(false);
        } catch (error) {
            addToast('playerInfo.playerDeletedError', 'error', { message: (error as Error).message });
        }
    };
    
    const filteredPlayers = useMemo(() => {
        if (!searchTerm) return allPlayers;
        return allPlayers.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.jerseyNumber.toString().includes(searchTerm)
        );
    }, [allPlayers, searchTerm]);
    
    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    const panelClasses = "bg-surface shadow-lg rounded-2xl p-4 sm:p-6";

    // Squad size is the first thing you want to know; the old design made you
    // count the list yourself.
    /** Colour band for a rating, so a strength is visibly a strength. */
    const skillTone = (value: number) =>
        value >= 75 ? { bar: 'bg-green-500', text: 'text-green-600 dark:text-green-500' }
        : value >= 50 ? { bar: 'bg-primary', text: 'text-primary' }
        : value >= 30 ? { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-500' }
        : { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-500' };

    const overall = (p: TournamentPlayer | null) => {
        const s = p?.skills;
        if (!s) return null;
        const vals = Object.values(s);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    };

    const SeasonPicker = () => (
        <div className="flex items-center gap-2">
            <label htmlFor="player-season-select" className="text-sm text-textSecondary">
                {translate('tournament.selectTournament')}
            </label>
            <select
                id="player-season-select"
                value={selectedTournamentId || ''}
                onChange={e => selectTournament(e.target.value)}
                disabled={isTournamentListLoading}
                className={`${inputClasses} max-w-xs`}
            >
                {isTournamentListLoading
                    ? <option>{translate('tournament.loading')}</option>
                    : tournaments.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name}{t.status === 'archived' ? ` (${translate('tournament.archivedSuffix')})` : ''}
                        </option>
                    ))}
            </select>
            {isSelectedTournamentArchived && (
                <span className="flex-shrink-0 rounded-md bg-warning/20 px-2 py-1 text-xs font-semibold text-textPrimary">
                    {translate('tournament.archivedBadge')}
                </span>
            )}
        </div>
    );

    if (isLoading) {
        return <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>;
    }

    const selectedOverall = overall(isEditing ? editedPlayer : selectedPlayer);
    // The hero shows edits as they are typed, so it reads from the draft.
    const shownPlayer = isEditing ? editedPlayer : selectedPlayer;
    const meta = metaFor(selectedPlayer?.id);
    // An uploaded photo is a data URI, which must never be shown in the URL
    // box - it is thousands of characters long.
    const isUploadedAvatar = !!editedPlayer?.avatarUrl?.startsWith('data:');
    // Slate when the player has no team: the hero must never go transparent and
    // borrow whatever is behind it.
    const heroColor = meta.team?.color || '#475569';

    return (
        <div className="space-y-6">
            {!embedded && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-bold text-textPrimary">{translate('playerInfo.title')}</h1>
                    <SeasonPicker />
                </div>
            )}

            {!selectedTournamentId && !isTournamentListLoading && (
                <p className="rounded-lg bg-surface p-4 text-textSecondary shadow">{translate('playerInfo.noSeasonSelected')}</p>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Roster column */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="overflow-hidden rounded-xl bg-surface shadow-lg lg:sticky lg:top-24">
                        <div className="border-b border-border p-4">
                            <div className="mb-3 flex items-baseline justify-between">
                                <h2 className="font-semibold text-textPrimary">{translate('playerInfo.title')}</h2>
                                <span className="text-sm font-medium text-textSecondary">
                                    {translate('playerInfo.squadCount', { count: allPlayers.length })}
                                </span>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={translate('playerInfo.searchPlaceholder')}
                                className={inputClasses}
                            />
                            {/* The add form used to sit open above the list at all
                                times, pushing the roster down even when only
                                browsing. It is now behind a toggle. */}
                            {canManagePlayers && (
                                <>
                                    <Button
                                        onClick={() => setIsAdding(a => !a)}
                                        variant={isAdding ? 'secondary' : 'primary'}
                                        size="sm"
                                        fullWidth
                                        className="mt-3"
                                    >
                                        <PlusIcon className="mr-1.5 h-4 w-4" />
                                        {translate(isAdding ? 'common.button.cancel' : 'playerInfo.addPlayer')}
                                    </Button>
                                    {isAdding && (
                                        <form onSubmit={handleAddPlayer} className="mt-3 space-y-2 rounded-lg bg-background p-3 dark:bg-slate-800/60">
                                            <input
                                                type="text"
                                                value={newPlayerName}
                                                onChange={e => setNewPlayerName(e.target.value)}
                                                placeholder={translate('manageTournament.players.add.namePlaceholder')}
                                                className={inputClasses}
                                                required
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={newPlayerJersey}
                                                    onChange={e => setNewPlayerJersey(e.target.value)}
                                                    placeholder={translate('manageTournament.players.add.jerseyPlaceholder')}
                                                    className={`${inputClasses} text-center`}
                                                    required
                                                />
                                                <Button type="submit" size="sm" className="flex-shrink-0">
                                                    {translate('playerInfo.addPlayer')}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>

                        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                            {filteredPlayers.length > 0 ? filteredPlayers.map(player => {
                                const isActive = selectedPlayer?.id === player.id;
                                const rowMeta = metaFor(player.id);
                                return (
                                    <li key={player.id}>
                                        <button
                                            onClick={() => handleSelectPlayer(player)}
                                            aria-current={isActive ? 'true' : undefined}
                                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                                isActive
                                                    ? 'bg-primary/10 border-l-[3px] border-primary'
                                                    : 'border-l-[3px] border-transparent hover:bg-black/[0.03] dark:hover:bg-white/5'
                                            }`}
                                        >
                                            {/* The shirt number is the identity a
                                                team-mate reaches for, so it stays
                                                visible next to the photo instead of
                                                being replaced by it. */}
                                            <span
                                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                                                style={{ backgroundColor: rowMeta.team?.color || '#94a3b8' }}
                                            >
                                                {player.jerseyNumber}
                                            </span>
                                            {player.avatarUrl ? (
                                                <img src={player.avatarUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10" />
                                            ) : (
                                                <UserCircleIcon className="h-9 w-9 flex-shrink-0 text-textSecondary/30" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate font-semibold ${isActive ? 'text-primary' : 'text-textPrimary'}`}>
                                                    {player.name}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-xs text-textSecondary">
                                                    {rowMeta.team ? (
                                                        <>
                                                            <TeamCrest src={teamLogoSrc(rowMeta.team)} name={rowMeta.team.name} className="h-4 w-4" />
                                                            <span className="truncate">{rowMeta.team.name}</span>
                                                        </>
                                                    ) : (
                                                        <span className="italic">{translate('playerInfo.noTeam')}</span>
                                                    )}
                                                </span>
                                            </span>
                                            {rowMeta.goals > 0 && (
                                                <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                                    <StarIcon className="h-3 w-3" />
                                                    {rowMeta.goals}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            }) : (
                                <li className="px-4 py-10 text-center text-sm text-textSecondary">
                                    {translate('playerInfo.noPlayers')}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Detail column */}
                <div className="lg:col-span-8 xl:col-span-9">
                    {!selectedPlayer ? (
                        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-surface p-10 text-center shadow-lg">
                            <UserCircleIcon className="mb-4 h-20 w-20 text-textSecondary/25" />
                            <h3 className="text-xl font-semibold text-textPrimary">{translate('playerInfo.noPlayerSelected')}</h3>
                            <p className="mt-1 text-textSecondary">{translate('playerInfo.selectPlayerPrompt')}</p>
                        </div>
                    ) : (
                        <div className={`overflow-hidden rounded-xl bg-surface shadow-lg ${isEditing ? 'ring-2 ring-primary' : ''}`}>
                            {isEditing && (
                                <div className="flex items-center gap-2 bg-primary px-5 py-2 text-sm font-semibold text-white">
                                    <PencilIcon className="h-4 w-4" />
                                    {translate('playerInfo.editing')}
                                </div>
                            )}

                            {/* Hero. The card is now the player's, so it wears the
                                team's colour and carries the shirt number big
                                enough to read across a room - the old header was a
                                white strip that said nothing about the season. */}
                            <div
                                className="relative overflow-hidden px-5 py-6 sm:px-7"
                                style={{
                                    background: `linear-gradient(135deg, ${heroColor} 0%, ${heroColor}cc 55%, rgba(15,23,42,0.55) 100%)`,
                                }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-[38%] -top-4 hidden select-none font-mono text-[9rem] font-black leading-none text-white/10 sm:right-[30%] sm:block"
                                >
                                    {shownPlayer?.jerseyNumber ?? ''}
                                </span>

                                <div className="relative flex flex-wrap items-center gap-5">
                                    <div className="relative flex-shrink-0">
                                        {shownPlayer?.avatarUrl ? (
                                            <img src={shownPlayer.avatarUrl} alt="" className="h-24 w-24 rounded-full border-4 border-white/80 object-cover shadow-lg" />
                                        ) : (
                                            <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/60 bg-white/15">
                                                <UserCircleIcon className="h-16 w-16 text-white/70" />
                                            </span>
                                        )}
                                        {/* Changing the photo is the one edit worth
                                            doing straight on the picture. */}
                                        {isEditing && (
                                            <>
                                                <input
                                                    ref={avatarInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => handleAvatarFile(e.target.files?.[0])}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    disabled={isReadingAvatar}
                                                    title={translate('playerInfo.avatarUpload')}
                                                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-105 disabled:opacity-60"
                                                >
                                                    {isReadingAvatar ? <LoadingSpinner size="sm" /> : <PencilIcon className="h-4 w-4" />}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h2 className="break-words text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                                            {shownPlayer?.name}
                                        </h2>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-sm font-bold text-white backdrop-blur-sm">
                                                #{shownPlayer?.jerseyNumber}
                                            </span>
                                            {meta.team ? (
                                                <span className="flex items-center gap-1.5 rounded-md bg-white/20 py-0.5 pl-1 pr-2.5 text-sm font-semibold text-white backdrop-blur-sm">
                                                    <TeamCrest src={teamLogoSrc(meta.team)} name={meta.team.name} className="h-5 w-5" />
                                                    {meta.team.name}
                                                </span>
                                            ) : (
                                                <span className="rounded-md bg-black/20 px-2 py-0.5 text-sm italic text-white/80">
                                                    {translate('playerInfo.noTeam')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* On a narrow screen this drops to its own row:
                                        squeezed beside the name, the team chip was
                                        wrapping mid-phrase. */}
                                    <div className="flex w-full flex-shrink-0 items-center justify-end gap-4 sm:w-auto">
                                        {selectedOverall !== null && (
                                            <div className="rounded-xl bg-white/95 px-4 py-2 text-center shadow-lg dark:bg-slate-900/90">
                                                <div className="text-3xl font-extrabold leading-none text-primary">{selectedOverall}</div>
                                                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-textSecondary">
                                                    {translate('playerInfo.overall')}
                                                </div>
                                            </div>
                                        )}
                                        {!isEditing && canEditPlayers && (
                                            <Button
                                                variant="secondary"
                                                onClick={() => setIsEditing(true)}
                                                className="flex-shrink-0 !bg-white !text-textPrimary shadow-lg hover:!bg-white/90"
                                            >
                                                <PencilIcon className="mr-2 h-4 w-4" />{translate('playerInfo.editDetails')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* What the player actually did this season. Ratings are
                                opinions; these three are facts. */}
                            <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-background dark:bg-slate-800/40">
                                {[
                                    { icon: <CalendarIcon className="h-4 w-4" />, label: translate('playerInfo.stat.played'), value: meta.played },
                                    { icon: <StarIcon className="h-4 w-4" />, label: translate('playerInfo.stat.goals'), value: meta.goals },
                                    {
                                        icon: null,
                                        label: translate('playerInfo.stat.perMatch'),
                                        value: meta.played > 0 ? (meta.goals / meta.played).toFixed(2) : '-',
                                    },
                                ].map(stat => (
                                    <div key={stat.label} className="px-3 py-3 text-center">
                                        <div className="text-2xl font-bold leading-none text-textPrimary">{stat.value}</div>
                                        <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-textSecondary">
                                            {stat.icon}{stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6 p-5">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-textPrimary">{translate('playerDetailModal.name')}</label>
                                                <input type="text" value={editedPlayer?.name || ''} onChange={e => setEditedPlayer(p => p ? { ...p, name: e.target.value } : null)} className={inputClasses} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-textPrimary">{translate('playerDetailModal.jersey')}</label>
                                                <input type="number" value={editedPlayer?.jerseyNumber || ''} onChange={e => setEditedPlayer(p => p ? { ...p, jerseyNumber: parseInt(e.target.value) || 0 } : null)} className={inputClasses} />
                                            </div>
                                        </div>
                                        {/* Uploading is the common case, so it is a
                                            labelled button of its own. It used to be
                                            only the small pencil on the photo, which
                                            reads as "edit" rather than "upload" and
                                            was missed entirely. */}
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-textPrimary">{translate('playerInfo.photo')}</label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    disabled={isReadingAvatar}
                                                    className="flex-shrink-0"
                                                >
                                                    {isReadingAvatar
                                                        ? <LoadingSpinner size="sm" />
                                                        : <><PlusIcon className="mr-1.5 h-4 w-4" />{translate('playerInfo.avatarUpload')}</>}
                                                </Button>
                                                {isUploadedAvatar && (
                                                    <span className="flex items-center gap-2 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                                                        <img src={editedPlayer!.avatarUrl!} alt="" className="h-6 w-6 rounded-full object-cover" />
                                                        {translate('playerInfo.avatarUploaded')}
                                                    </span>
                                                )}
                                                {editedPlayer?.avatarUrl && (
                                                    <Button variant="secondary" size="sm" className="flex-shrink-0" onClick={() => setEditedPlayer(p => p ? { ...p, avatarUrl: null } : null)}>
                                                        {translate('playerInfo.avatarClear')}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="mt-2">
                                                <label className="mb-1 block text-xs text-textSecondary">{translate('playerInfo.avatarUrl')}</label>
                                                <input
                                                    type="text"
                                                    value={isUploadedAvatar ? '' : (editedPlayer?.avatarUrl || '')}
                                                    onChange={e => setEditedPlayer(p => p ? { ...p, avatarUrl: e.target.value } : null)}
                                                    placeholder={translate('playerInfo.avatarPlaceholder')}
                                                    className={inputClasses}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-textPrimary">{translate('playerInfo.bio')}</label>
                                            <textarea value={editedPlayer?.bio || ''} onChange={e => setEditedPlayer(p => p ? { ...p, bio: e.target.value } : null)} placeholder={translate('playerInfo.bioPlaceholder')} rows={4} className={inputClasses} />
                                        </div>
                                    </div>
                                ) : selectedPlayer.bio ? (
                                    // An empty bio used to render a grey box saying
                                    // there was nothing in it, on every player.
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-textSecondary">{translate('playerInfo.bio')}</h3>
                                        <p className="whitespace-pre-wrap rounded-lg bg-background p-4 text-textPrimary dark:bg-slate-800/60">{selectedPlayer.bio}</p>
                                    </div>
                                ) : null}

                                <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${isEditing || selectedPlayer.bio ? 'border-t border-border pt-6' : ''}`}>
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-textSecondary">
                                            {translate('playerDetailModal.skillsTitle')}
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.keys(defaultSkills).map(key => {
                                                const value = editedPlayer?.skills?.[key as keyof PlayerSkills] || 50;
                                                return (
                                                    <div key={key}>
                                                        <label className="mb-1 flex items-center justify-between text-sm font-medium text-textPrimary">
                                                            <span>{translate(`playerSkills.${key as keyof PlayerSkills}`)}</span>
                                                            <span className={`font-mono font-bold ${skillTone(value).text}`}>{value}</span>
                                                        </label>
                                                        {isEditing ? (
                                                            <input
                                                                type="range" min="1" max="99" value={value}
                                                                onChange={e => setEditedPlayer(p => p ? { ...p, skills: { ...p.skills!, [key]: parseInt(e.target.value) } } : null)}
                                                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary dark:bg-slate-700"
                                                            />
                                                        ) : (
                                                            // Read mode shows a bar, not a dead slider: a
                                                            // disabled range control looks broken rather
                                                            // than informative. Coloured by band so a
                                                            // strength stands out from a weakness.
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                                                                <div className={`h-full rounded-full transition-all duration-500 ${skillTone(value).bar}`} style={{ width: `${value}%` }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-background p-2 dark:bg-slate-800/40">
                                        <PlayerSkillChart skills={editedPlayer?.skills || defaultSkills} size={250} />
                                    </div>
                                </div>

                                {isEditing && canEditPlayers && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                                        {/* Kept well away from Save: the two used to
                                            sit side by side. Absent entirely for a
                                            non-admin, so the row collapses to the
                                            save controls rather than showing a
                                            button that would be refused. */}
                                        {canManagePlayers ? (
                                            <Button variant="danger" onClick={handleDeletePlayer}>
                                                <TrashIcon className="mr-2 h-4 w-4" />{translate('playerInfo.deletePlayer')}
                                            </Button>
                                        ) : <span />}
                                        <div className="flex gap-2">
                                            <Button variant="secondary" onClick={() => { setIsEditing(false); setEditedPlayer(selectedPlayer); }}>
                                                {translate('common.button.cancel')}
                                            </Button>
                                            <Button onClick={handleSaveChanges} disabled={isSaving}>
                                                {isSaving ? <LoadingSpinner size="sm" /> : translate('playerInfo.saveChanges')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
