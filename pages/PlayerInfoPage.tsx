import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TournamentPlayer, PlayerSkills } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { Button } from '../components/shared/Button';
import { PlusIcon, PencilIcon, TrashIcon, UserCircleIcon } from '../components/icons';
import {
    onAllPlayersUpdate,
    addPlayer,
    updatePlayer,
    deletePlayer as performDeletePlayer
} from '../services/firebaseService';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { PlayerSkillChart } from '../components/Tournament/PlayerSkillChart';

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
        addToast, isFirebaseReady, isAdmin,
        selectedTournamentId, tournaments, selectTournament,
        isTournamentListLoading, isSelectedTournamentArchived,
    } = useAppContext();
    // Squads belong to a season now, and the season's squad is the admin's to
    // manage - an archived season is frozen for everyone.
    const canEdit = isAdmin && !isSelectedTournamentArchived;
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

    const handleSelectPlayer = (player: TournamentPlayer) => {
        setSelectedPlayer(player);
        setEditedPlayer({ ...player, skills: player.skills || defaultSkills });
        setIsEditing(false);
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
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
        if (!editedPlayer) return;
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
        if (!selectedPlayer) return;
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
    const panelClasses = "bg-surface shadow-lg rounded-lg p-4 sm:p-6";

    // Squad size is the first thing you want to know; the old design made you
    // count the list yourself.
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
                            {canEdit && (
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
                                return (
                                    <li key={player.id}>
                                        <button
                                            onClick={() => handleSelectPlayer(player)}
                                            aria-current={isActive ? 'true' : undefined}
                                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                isActive
                                                    ? 'bg-primary/10 border-l-[3px] border-primary'
                                                    : 'border-l-[3px] border-transparent hover:bg-black/[0.03] dark:hover:bg-white/5'
                                            }`}
                                        >
                                            {player.avatarUrl ? (
                                                <img src={player.avatarUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                                            ) : (
                                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/5 font-mono text-sm font-bold text-textSecondary dark:bg-white/10">
                                                    {player.jerseyNumber}
                                                </span>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate font-semibold ${isActive ? 'text-primary' : 'text-textPrimary'}`}>
                                                    {player.name}
                                                </span>
                                                <span className="block font-mono text-xs text-textSecondary">
                                                    #{player.jerseyNumber}
                                                </span>
                                            </span>
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
                            {/* Identity band. In edit mode the ring plus this
                                banner make the state unmistakable - the old design
                                only swapped the heading text for "Editing". */}
                            {isEditing && (
                                <div className="flex items-center gap-2 bg-primary px-5 py-2 text-sm font-semibold text-white">
                                    <PencilIcon className="h-4 w-4" />
                                    {translate('playerInfo.editing')}
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
                                <div className="flex min-w-0 items-center gap-4">
                                    {editedPlayer?.avatarUrl ? (
                                        <img src={editedPlayer.avatarUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full border-2 border-primary object-cover" />
                                    ) : (
                                        <UserCircleIcon className="h-16 w-16 flex-shrink-0 text-textSecondary/30" />
                                    )}
                                    <div className="min-w-0">
                                        <h2 className="truncate text-2xl font-bold text-textPrimary">{selectedPlayer.name}</h2>
                                        <p className="font-mono text-sm text-textSecondary">
                                            {translate('playerDetailModal.jersey')} #{selectedPlayer.jerseyNumber}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {selectedOverall !== null && (
                                        <div className="text-center">
                                            <div className="text-3xl font-extrabold leading-none text-primary">{selectedOverall}</div>
                                            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-textSecondary">
                                                {translate('playerInfo.overall')}
                                            </div>
                                        </div>
                                    )}
                                    {!isEditing && canEdit && (
                                        <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-shrink-0">
                                            <PencilIcon className="mr-2 h-4 w-4" />{translate('playerInfo.editDetails')}
                                        </Button>
                                    )}
                                </div>
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
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-textPrimary">{translate('playerInfo.avatarUrl')}</label>
                                            <input type="text" value={editedPlayer?.avatarUrl || ''} onChange={e => setEditedPlayer(p => p ? { ...p, avatarUrl: e.target.value } : null)} placeholder={translate('playerInfo.avatarPlaceholder')} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-textPrimary">{translate('playerInfo.bio')}</label>
                                            <textarea value={editedPlayer?.bio || ''} onChange={e => setEditedPlayer(p => p ? { ...p, bio: e.target.value } : null)} placeholder={translate('playerInfo.bioPlaceholder')} rows={4} className={inputClasses} />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-textSecondary">{translate('playerInfo.bio')}</h3>
                                        {selectedPlayer.bio ? (
                                            <p className="whitespace-pre-wrap rounded-lg bg-background p-4 text-textPrimary dark:bg-slate-800/60">{selectedPlayer.bio}</p>
                                        ) : (
                                            <p className="rounded-lg bg-background p-4 italic text-textSecondary dark:bg-slate-800/60">{translate('playerInfo.noBio')}</p>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 border-t border-border pt-6 lg:grid-cols-2">
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
                                                            <span className="font-mono font-bold text-primary">{value}</span>
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
                                                            // than informative.
                                                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                                                                <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex min-h-[260px] items-center justify-center">
                                        <PlayerSkillChart skills={editedPlayer?.skills || defaultSkills} size={300} />
                                    </div>
                                </div>

                                {isEditing && canEdit && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                                        {/* Kept well away from Save: the two used to
                                            sit side by side. */}
                                        <Button variant="danger" onClick={handleDeletePlayer}>
                                            <TrashIcon className="mr-2 h-4 w-4" />{translate('playerInfo.deletePlayer')}
                                        </Button>
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
