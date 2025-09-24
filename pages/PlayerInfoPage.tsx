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

export const PlayerInfoPage: React.FC = () => {
    const { translate } = useLanguage();
    const { addToast, isFirebaseReady, canEdit } = useAppContext();
    const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerJersey, setNewPlayerJersey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayer | null>(null);
    const [editedPlayer, setEditedPlayer] = useState<TournamentPlayer | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isFirebaseReady) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const unsubscribe = onAllPlayersUpdate((players) => {
            setAllPlayers(players);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isFirebaseReady]);

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
                await addPlayer({ name, jerseyNumber: jersey });
                addToast('playerInfo.playerAddedSuccess', 'success');
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
            await updatePlayer(id, dataToUpdate);
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
            await performDeletePlayer(selectedPlayer.id);
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

    const PlayerDetailPlaceholder = () => (
        <div className="flex flex-col items-center justify-center h-full text-center text-textSecondary p-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
            <UserCircleIcon className="w-24 h-24 text-gray-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-textPrimary">{translate('playerInfo.noPlayerSelected')}</h3>
            <p>{translate('playerInfo.selectPlayerPrompt')}</p>
        </div>
    );

    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-textPrimary">{translate('playerInfo.title')}</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Player List & Add Form */}
                <div className="lg:col-span-1 space-y-4">
                    {canEdit && (
                        <div className={panelClasses}>
                            <h3 className="text-lg font-semibold mb-3 text-textPrimary">{translate('playerInfo.addPlayer')}</h3>
                            <form onSubmit={handleAddPlayer} className="flex flex-col sm:flex-row items-end gap-3">
                                <div className="w-full sm:flex-grow">
                                    <label htmlFor="new-player-name" className="block text-sm font-medium text-textPrimary mb-1">{translate('playerDetailModal.name')}</label>
                                    <input id="new-player-name" type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder={translate('manageTournament.players.add.namePlaceholder')} className={inputClasses} required />
                                </div>
                                <div className="w-full sm:w-32">
                                    <label htmlFor="new-player-jersey" className="block text-sm font-medium text-textPrimary mb-1">{translate('playerDetailModal.jersey')}</label>
                                    <input id="new-player-jersey" type="number" value={newPlayerJersey} onChange={e => setNewPlayerJersey(e.target.value)} placeholder={translate('manageTournament.players.add.jerseyPlaceholder')} className={`${inputClasses} text-center`} required />
                                </div>
                                <Button type="submit" className="w-full sm:w-auto"><PlusIcon className="w-5 h-5"/></Button>
                            </form>
                        </div>
                    )}

                    <div className={panelClasses}>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={translate('playerInfo.searchPlaceholder')} className={inputClasses} />
                        <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {filteredPlayers.length > 0 ? (
                                filteredPlayers.map(player => (
                                    <button key={player.id} onClick={() => handleSelectPlayer(player)} className={`w-full text-left flex items-center gap-4 p-3 rounded-md transition-colors ${selectedPlayer?.id === player.id ? 'bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                                        <span className={`font-mono text-lg w-8 text-center ${selectedPlayer?.id === player.id ? 'text-primary font-bold' : 'text-textSecondary'}`}>#{player.jerseyNumber}</span>
                                        <span className={`font-semibold ${selectedPlayer?.id === player.id ? 'text-primary' : 'text-textPrimary'}`}>{player.name}</span>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-textSecondary py-4">{translate('playerInfo.noPlayers')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Player Details */}
                <div className="lg:col-span-2">
                    <div className={`${panelClasses} min-h-[500px]`}>
                        {!selectedPlayer ? <PlayerDetailPlaceholder /> : (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        {editedPlayer?.avatarUrl ? (
                                            <img src={editedPlayer.avatarUrl} alt={editedPlayer.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                                        ) : (
                                            <UserCircleIcon className="w-16 h-16 text-gray-300 dark:text-slate-600" />
                                        )}
                                        <div>
                                            <h2 className="text-2xl font-bold text-textPrimary">{isEditing ? translate('playerInfo.editing') : selectedPlayer.name}</h2>
                                             <p className="text-lg text-textSecondary">{isEditing ? selectedPlayer.name : `${translate('playerDetailModal.jersey')} #${selectedPlayer.jerseyNumber}`}</p>
                                        </div>
                                    </div>
                                    {!isEditing && canEdit && (
                                        <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-shrink-0">
                                            <PencilIcon className="w-4 h-4 mr-2" />{translate('playerInfo.editDetails')}
                                        </Button>
                                    )}
                                </div>

                                {/* Details & Bio */}
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium text-textPrimary mb-1">{translate('playerDetailModal.name')}</label><input type="text" value={editedPlayer?.name || ''} onChange={e => setEditedPlayer(p => p ? {...p, name: e.target.value} : null)} className={inputClasses} /></div>
                                            <div><label className="block text-sm font-medium text-textPrimary mb-1">{translate('playerDetailModal.jersey')}</label><input type="number" value={editedPlayer?.jerseyNumber || ''} onChange={e => setEditedPlayer(p => p ? {...p, jerseyNumber: parseInt(e.target.value) || 0} : null)} className={inputClasses} /></div>
                                        </div>
                                        <div><label className="block text-sm font-medium text-textPrimary mb-1">{translate('playerInfo.avatarUrl')}</label><input type="text" value={editedPlayer?.avatarUrl || ''} onChange={e => setEditedPlayer(p => p ? { ...p, avatarUrl: e.target.value } : null)} placeholder={translate('playerInfo.avatarPlaceholder')} className={inputClasses} /></div>
                                        <div>
                                            <label className="block text-sm font-medium text-textPrimary mb-1">{translate('playerInfo.bio')}</label>
                                            <textarea value={editedPlayer?.bio || ''} onChange={e => setEditedPlayer(p => p ? {...p, bio: e.target.value} : null)} placeholder={translate('playerInfo.bioPlaceholder')} rows={4} className={inputClasses}></textarea>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="text-lg font-semibold text-textPrimary">{translate('playerInfo.bio')}</h3>
                                        <p className="mt-1 text-textSecondary whitespace-pre-wrap bg-gray-50 dark:bg-slate-800/50 p-3 rounded-md min-h-[80px]">{selectedPlayer.bio || 'N/A'}</p>
                                    </div>
                                )}
                                
                                {/* Skills & Chart */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-textPrimary">{translate('playerDetailModal.skillsTitle')}</h3>
                                        {Object.keys(defaultSkills).map(key => (
                                            <div key={key}>
                                                <label className="flex justify-between items-center text-sm font-medium text-textPrimary mb-1">
                                                    <span>{translate(`playerSkills.${key as keyof PlayerSkills}`)}</span>
                                                    <span className="font-bold text-primary">{editedPlayer?.skills?.[key as keyof PlayerSkills] || 50}</span>
                                                </label>
                                                <input type="range" min="1" max="99" value={editedPlayer?.skills?.[key as keyof PlayerSkills] || 50} onChange={e => isEditing && setEditedPlayer(p => p ? {...p, skills: {...p.skills!, [key]: parseInt(e.target.value)}} : null)} disabled={!isEditing} className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-center h-full min-h-[250px]">
                                        <PlayerSkillChart skills={editedPlayer?.skills || defaultSkills} size={400} />
                                    </div>
                                </div>
                                
                                {isEditing && canEdit && (
                                    <div className="flex justify-between items-center pt-4 border-t border-border">
                                        <Button variant="danger" onClick={handleDeletePlayer}><TrashIcon className="w-4 h-4 mr-2" />{translate('playerInfo.deletePlayer')}</Button>
                                        <div className="flex gap-2">
                                            <Button variant="secondary" onClick={() => { setIsEditing(false); setEditedPlayer(selectedPlayer); }}>{translate('common.button.cancel')}</Button>
                                            <Button onClick={handleSaveChanges} disabled={isSaving}>{isSaving ? <LoadingSpinner size="sm" /> : translate('playerInfo.saveChanges')}</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
