import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { Tournament, TournamentTeam, TournamentPlayer } from '../../types';
import { updateTournament } from '../../services/firebaseService';
import { TOURNAMENT_DOC_ID } from '../../constants';
import { PlusIcon, XIcon, PencilAltIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface ManageTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

export const ManageTournamentModal: React.FC<ManageTournamentModalProps> = ({ isOpen, onClose, tournament: initialTournament }) => {
    const { translate } = useLanguage();
    const { currentUser, addToast } = useAppContext();

    const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
    
    // Team state
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [memberSelection, setMemberSelection] = useState<Record<string, string>>({});

    // Player state
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerJersey, setNewPlayerJersey] = useState<string>('');
    
    // General state
    const [tournamentName, setTournamentName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const currentTeams = initialTournament ? JSON.parse(JSON.stringify(initialTournament.teams)) : [];
            const currentPlayers = initialTournament ? JSON.parse(JSON.stringify(initialTournament.players || [])) : [];
            setTeams(currentTeams);
            setPlayers(currentPlayers);
            setTournamentName(initialTournament?.name || 'V-League Season 1');
            setActiveTab('teams');
            setNewTeamName('');
            setNewPlayerName('');
            setNewPlayerJersey('');
        }
    }, [isOpen, initialTournament]);

    // --- Team Management ---
    const handleAddTeam = () => {
        if (!newTeamName.trim()) {
            addToast('manageTournament.error.teamNameRequired', 'error');
            return;
        }
        if (teams.some(t => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
            addToast('manageTournament.error.teamNameExists', 'error');
            return;
        }
        const newTeam: TournamentTeam = {
            id: `team_${Date.now()}`,
            name: newTeamName.trim(),
            members: [],
            logoUrl: null,
            captainId: null,
            color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}` // Random color
        };
        setTeams(prev => [...prev, newTeam]);
        setNewTeamName('');
    };
    
    const handleRemoveTeam = (teamId: string) => {
        setTeams(prev => prev.filter(t => t.id !== teamId));
    };

    const handleAddMemberToTeam = (teamId: string) => {
        const playerIdToAdd = memberSelection[teamId];
        if (!playerIdToAdd) return;

        const team = teams.find(t => t.id === teamId);
        if (team?.members.some(m => m.playerId === playerIdToAdd)) {
            addToast('manageTournament.error.memberNameExists', 'error');
            return;
        }

        setTeams(prev => prev.map(t =>
            t.id === teamId
                ? { ...t, members: [...t.members, { playerId: playerIdToAdd }] }
                : t
        ));
        setMemberSelection(prev => ({ ...prev, [teamId]: '' }));
    };

    const handleRemoveMemberFromTeam = (teamId: string, playerId: string) => {
        setTeams(prev => prev.map(t =>
            t.id === teamId
                ? { ...t, members: t.members.filter(m => m.playerId !== playerId) }
                : t
        ));
    };

    // --- Player Management ---
    const handleAddPlayer = () => {
        const name = newPlayerName.trim();
        const jersey = parseInt(newPlayerJersey, 10);

        if (!name) {
            addToast('manageTournament.players.error.nameRequired', 'error');
            return;
        }
        if (isNaN(jersey)) {
            addToast('manageTournament.players.error.jerseyRequired', 'error');
            return;
        }
        if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            addToast('manageTournament.players.error.nameExists', 'error');
            return;
        }
        if (jersey !== 0 && players.some(p => p.jerseyNumber === jersey)) {
            addToast('manageTournament.players.error.jerseyExists', 'error');
            return;
        }

        const newPlayer: TournamentPlayer = {
            id: `player_${Date.now()}`,
            name,
            jerseyNumber: jersey,
        };
        setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
        setNewPlayerName('');
        setNewPlayerJersey('');
    };

    const handleEditPlayer = (playerId: string, field: 'name' | 'jerseyNumber', value: string | number) => {
        setPlayers(prevPlayers => prevPlayers.map(p =>
            p.id === playerId ? { ...p, [field]: value } : p
        ));
    };

    const handleRemovePlayer = (playerIdToRemove: string) => {
        if (!window.confirm(translate('manageTournament.players.deleteConfirm'))) return;

        // Remove from global list
        setPlayers(prev => prev.filter(p => p.id !== playerIdToRemove));

        // Remove from all teams
        setTeams(prevTeams => prevTeams.map(team => ({
            ...team,
            members: team.members.filter(m => m.playerId !== playerIdToRemove),
        })));
    };

    // --- Save Logic ---
    const handleSaveChanges = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            const dataToSave: Partial<Tournament> = { name: tournamentName, teams, players };
            if (!initialTournament) {
                dataToSave.schedule = [];
                dataToSave.standings = [];
            }
            await updateTournament(TOURNAMENT_DOC_ID, dataToSave, currentUser);
            addToast('manageTournament.saveSuccess', 'success');
            onClose();
        } catch (error) {
            addToast('manageTournament.saveError', 'error', { error: (error as Error).message });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const modalTitle = initialTournament ? translate('manageTournament.title') : translate('manageTournament.createTitle');
    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    const tabButtonBase = "px-4 py-2 text-sm font-medium border-b-2 transition-colors";
    const activeTabClass = "border-primary text-primary";
    const inactiveTabClass = "border-transparent text-textSecondary hover:border-gray-300 dark:hover:border-slate-600 hover:text-textPrimary";

    const renderPlayersTab = () => (
        <div className="space-y-4">
            <div className="p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-textPrimary">{translate('manageTournament.button.addPlayer')}</h4>
                <div className="flex items-center space-x-2">
                    <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder={translate('manageTournament.players.add.namePlaceholder')} className={inputClasses} />
                    <input type="number" value={newPlayerJersey} onChange={e => setNewPlayerJersey(e.target.value)} placeholder={translate('manageTournament.players.add.jerseyPlaceholder')} className={`${inputClasses} w-24`} />
                    <Button type="button" onClick={handleAddPlayer}><PlusIcon className="w-5 h-5"/></Button>
                </div>
            </div>
             <div className="space-y-2">
                {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-surface dark:bg-slate-700/50 rounded-md gap-2">
                        <input
                            type="text"
                            value={player.name}
                            onChange={e => handleEditPlayer(player.id, 'name', e.target.value)}
                            className={inputClasses}
                        />
                        <input
                            type="number"
                            value={player.jerseyNumber}
                            onChange={e => handleEditPlayer(player.id, 'jerseyNumber', parseInt(e.target.value, 10) || 0)}
                            className={`${inputClasses} w-20 text-center`}
                        />
                        <Button type="button" onClick={() => handleRemovePlayer(player.id)} variant="danger" size="sm" className="!p-2"><XIcon className="w-4 h-4"/></Button>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const renderTeamsTab = () => (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder={translate('manageTournament.teamName.placeholder')} className={inputClasses} />
                <Button type="button" onClick={handleAddTeam}><PlusIcon className="w-5 h-5 mr-1"/>{translate('manageTournament.button.addTeam')}</Button>
            </div>
            <div className="space-y-4">
                {teams.map(team => {
                     const teamMemberIds = new Set(team.members.map(m => m.playerId));
                     const availablePlayers = players.filter(p => !teamMemberIds.has(p.id));

                    return (
                        <div key={team.id} className="p-3 bg-background dark:bg-slate-800 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                 <div className="flex items-center gap-3 flex-grow">
                                    <input
                                        type="color"
                                        value={team.color || '#a1a1aa'}
                                        onChange={(e) => setTeams(prev => prev.map(t => t.id === team.id ? { ...t, color: e.target.value } : t))}
                                        className="w-8 h-8 p-1 bg-surface dark:bg-slate-700 border border-border rounded-md cursor-pointer"
                                        title={translate('manageTournament.team.changeColor')}
                                    />
                                    <input
                                        type="text"
                                        value={team.name}
                                        onChange={(e) => setTeams(prev => prev.map(t => t.id === team.id ? { ...t, name: e.target.value } : t))}
                                        className="font-bold text-lg bg-transparent border-none focus:ring-0 p-1 w-full text-textPrimary"
                                    />
                                </div>
                                <Button type="button" onClick={() => handleRemoveTeam(team.id)} variant="danger" size="sm"><XIcon className="w-4 h-4 mr-1"/>{translate('manageTournament.button.removeTeam')}</Button>
                            </div>
                            <div className="space-y-2 mb-2">
                                {team.members.map(memberRef => {
                                    const member = players.find(p => p.id === memberRef.playerId);
                                    if (!member) return null;
                                    return (
                                        <div key={member.id} className="flex items-center justify-between text-sm bg-surface dark:bg-slate-700 p-2 rounded">
                                            <span>{member.name} (#{member.jerseyNumber})</span>
                                            <Button type="button" onClick={() => handleRemoveMemberFromTeam(team.id, member.id)} variant="ghost" size="sm" className="!p-1"><XIcon className="w-4 h-4 text-danger"/></Button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                                <select
                                    value={memberSelection[team.id] || ''}
                                    onChange={e => setMemberSelection(prev => ({ ...prev, [team.id]: e.target.value }))}
                                    className={`${inputClasses} text-sm`}
                                >
                                    <option value="">{translate('manageTournament.selectMember')}</option>
                                    {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.jerseyNumber})</option>)}
                                </select>
                                <Button type="button" onClick={() => handleAddMemberToTeam(team.id)} size="sm">{translate('manageTournament.button.addMember')}</Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
            <form onSubmit={(e) => e.preventDefault()}>
                <div className="border-b border-border mb-4">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button type="button" onClick={() => setActiveTab('teams')} className={`${tabButtonBase} ${activeTab === 'teams' ? activeTabClass : inactiveTabClass}`}>{translate('manageTournament.tab.teams')}</button>
                        <button type="button" onClick={() => setActiveTab('players')} className={`${tabButtonBase} ${activeTab === 'players' ? activeTabClass : inactiveTabClass}`}>{translate('manageTournament.tab.players')}</button>
                    </nav>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {activeTab === 'teams' ? renderTeamsTab() : renderPlayersTab()}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
                    <Button type="button" onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
                    <Button type="button" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" /> : translate('manageTournament.button.saveChanges')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};