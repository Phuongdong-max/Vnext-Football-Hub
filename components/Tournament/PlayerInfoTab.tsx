import React, { useState, useMemo } from 'react';
import { TournamentPlayer } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../shared/Button';
import { PlusIcon, PencilIcon, TrashIcon } from '../icons';

interface PlayerInfoTabProps {
    players: TournamentPlayer[];
    onAddPlayer: (playerData: Omit<TournamentPlayer, 'id' | 'skills'>) => Promise<void>;
    onDeletePlayer: (playerId: string) => Promise<void>;
    onSelectPlayer: (player: TournamentPlayer) => void;
}

export const PlayerInfoTab: React.FC<PlayerInfoTabProps> = ({ players, onAddPlayer, onDeletePlayer, onSelectPlayer }) => {
    const { translate } = useLanguage();
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerJersey, setNewPlayerJersey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newPlayerName.trim();
        const jersey = parseInt(newPlayerJersey, 10);
        if (name && !isNaN(jersey)) {
            await onAddPlayer({ name, jerseyNumber: jersey });
            setNewPlayerName('');
            setNewPlayerJersey('');
        }
    };

    const filteredPlayers = useMemo(() => {
        if (!searchTerm) return players;
        return players.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.jerseyNumber.toString().includes(searchTerm)
        );
    }, [players, searchTerm]);

    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    const panelClasses = "bg-surface shadow-lg rounded-2xl p-4 sm:p-6";

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-textPrimary">{translate('playerInfo.title')}</h2>

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
                    <Button type="submit" className="w-full sm:w-auto"><PlusIcon className="w-5 h-5 mr-1" />{translate('manageTournament.players.add.button')}</Button>
                </form>
            </div>

            <div className={panelClasses}>
                <div className="mb-4">
                    <label htmlFor="search-player" className="sr-only">{translate('playerInfo.searchPlaceholder')}</label>
                    <input id="search-player" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={translate('playerInfo.searchPlaceholder')} className={inputClasses} />
                </div>

                <div className="space-y-2">
                    {filteredPlayers.length > 0 ? (
                        filteredPlayers.map(player => (
                            <div key={player.id} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4 cursor-pointer flex-grow" onClick={() => onSelectPlayer(player)}>
                                    <span className="font-mono text-primary text-lg w-8 text-center">#{player.jerseyNumber}</span>
                                    <span className="font-semibold text-textPrimary">{player.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => onSelectPlayer(player)} aria-label={`Edit ${player.name}`}>
                                        <PencilIcon className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => onDeletePlayer(player.id)} aria-label={`Delete ${player.name}`}>
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-textSecondary py-4">{translate('playerInfo.noPlayers')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};
