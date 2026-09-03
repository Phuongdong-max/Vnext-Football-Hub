import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { Tournament, TournamentTeam, TournamentPlayer } from '../../types';
import { updateTournament, addPlayer, updatePlayer, deletePlayer, copyPlayersIntoTournament } from '../../services/firebaseService';
import { PlusIcon, XIcon, InformationCircleIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { TeamLogoPicker } from './TeamLogoPicker';

interface ManageTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    allPlayers: TournamentPlayer[]; // global player list for management
    availablePlayersForLookup: TournamentPlayer[]; // combined list for display/selection
}

export const ManageTournamentModal: React.FC<ManageTournamentModalProps> = ({ isOpen, onClose, tournament: initialTournament, allPlayers, availablePlayersForLookup }) => {
    const { translate } = useLanguage();
    const { currentUser, addToast } = useAppContext();

    const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
    
    // Team state
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [memberSelection, setMemberSelection] = useState<Record<string, string>>({});

    // Player state
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerJersey, setNewPlayerJersey] = useState<string>('');
    
    // General state
    const [isSaving, setIsSaving] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    
    const isLegacyTournament = !!initialTournament.players && initialTournament.players.length > 0;

    useEffect(() => {
        if (isOpen && initialTournament) {
            // Deep copy to prevent direct mutation of the prop
            const initialTeamsCopy = JSON.parse(JSON.stringify(initialTournament.teams || []));
            setTeams(initialTeamsCopy);
            
            // Reset other states
            setActiveTab('teams');
            setNewTeamName('');
            setNewPlayerName('');
            setNewPlayerJersey('');
        }
    }, [isOpen, initialTournament]);
    
    const handleMigrate = async () => {
        if (!isLegacyTournament || !initialTournament.players || !currentUser) return;
        
        setIsMigrating(true);
        try {
            // Step 1: move the embedded legacy players into this season's own squad
            await copyPlayersIntoTournament(initialTournament.id, initialTournament.players);

            // Step 2: Remove the legacy 'players' array from the tournament document
            await updateTournament(initialTournament.id, {
                players: window.firebase.firestore.FieldValue.delete()
            }, currentUser);

            addToast('manageTournament.migration.success', 'success');
            // The modal will re-render automatically because the parent's listener will
            // provide updated tournament data, where `isLegacyTournament` will be false.
        } catch (error) {
            addToast('manageTournament.migration.error', 'error', { error: (error as Error).message });
            console.error("Migration failed:", error);
        } finally {
            setIsMigrating(false);
        }
    };


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

    // --- Player Management (Now interacts directly with service) ---
    const handleAddPlayer = async () => {
        const name = newPlayerName.trim();
        const jersey = parseInt(newPlayerJersey, 10);

        if (!name) { addToast('manageTournament.players.error.nameRequired', 'error'); return; }
        if (isNaN(jersey)) { addToast('manageTournament.players.error.jerseyRequired', 'error'); return; }
        if (allPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) { addToast('manageTournament.players.error.nameExists', 'error'); return; }
        if (jersey !== 0 && allPlayers.some(p => p.jerseyNumber === jersey)) { addToast('manageTournament.players.error.jerseyExists', 'error'); return; }

        try {
            await addPlayer(initialTournament.id, { name, jerseyNumber: jersey });
            addToast('Cầu thủ đã được thêm thành công!', 'success');
            setNewPlayerName('');
            setNewPlayerJersey('');
        } catch (error) {
            addToast((error as Error).message, 'error');
        }
    };

    const handleUpdatePlayer = async (playerId: string, field: 'name' | 'jerseyNumber', value: string | number) => {
        try {
            // Basic validation before updating
            if(field === 'name' && typeof value === 'string' && !value.trim()) {
                addToast('manageTournament.players.error.nameRequired', 'error');
                return; // Don't update if name is empty
            }
            await updatePlayer(initialTournament.id, playerId, { [field]: value });
            addToast('Thông tin cầu thủ đã được cập nhật.', 'info');
        } catch (error) {
            addToast((error as Error).message, 'error');
        }
    };

    const handleRemovePlayer = async (playerIdToRemove: string) => {
        if (!window.confirm(translate('manageTournament.players.deleteConfirm'))) return;

        try {
            // Removes the player from this season's squad only; past seasons keep theirs.
            await deletePlayer(initialTournament.id, playerIdToRemove);

            setTeams(prevTeams => prevTeams.map(team => ({
                ...team,
                members: team.members.filter(m => m.playerId !== playerIdToRemove),
            })));

            addToast('Cầu thủ đã được xoá.', 'success');
        } catch (error) {
            addToast((error as Error).message, 'error');
        }
    };

    // --- Save Logic ---
    const handleSaveChanges = async () => {
        if (!currentUser || !initialTournament) return;
        setIsSaving(true);
        try {
            // When saving, we remove the legacy 'players' field to finalize migration for this tournament
            const dataToUpdate: Partial<Tournament> = { teams };
            await updateTournament(initialTournament.id, dataToUpdate, currentUser);
            addToast('manageTournament.saveSuccess', 'success');
            onClose();
        } catch (error) {
            addToast('manageTournament.saveError', 'error', { error: (error as Error).message });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const modalTitle = translate('manageTournament.title');
    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    const tabButtonBase = "px-4 py-2 text-sm font-medium border-b-2 transition-colors";
    const activeTabClass = "border-primary text-primary";
    const inactiveTabClass = "border-transparent text-textSecondary hover:border-gray-300 dark:hover:border-slate-600 hover:text-textPrimary";
    
    if (isLegacyTournament) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={translate('manageTournament.migration.title')} size="lg">
                <div className="text-center p-4">
                    <InformationCircleIcon className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
                    <h3 className="text-xl font-bold text-textPrimary">{translate('manageTournament.legacyWarning.title')}</h3>
                    <p className="mt-2 text-textSecondary">
                        {translate('manageTournament.migration.body')}
                    </p>
                    <Button onClick={handleMigrate} disabled={isMigrating} size="lg" className="mt-6">
                        {isMigrating ? <LoadingSpinner size="sm" /> : translate('manageTournament.migration.button')}
                    </Button>
                </div>
            </Modal>
        );
    }


    const renderPlayersTab = () => (
        <div className="space-y-4">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg text-sm flex items-start gap-2">
                <InformationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{translate('manageTournament.players.liveSaveInfo')}</span>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-textPrimary">{translate('manageTournament.button.addPlayer')}</h4>
                <div className="flex items-center space-x-2">
                    <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder={translate('manageTournament.players.add.namePlaceholder')} className={inputClasses} />
                    <input type="number" value={newPlayerJersey} onChange={e => setNewPlayerJersey(e.target.value)} placeholder={translate('manageTournament.players.add.jerseyPlaceholder')} className={`${inputClasses} w-24`} />
                    <Button type="button" onClick={handleAddPlayer}><PlusIcon className="w-5 h-5"/></Button>
                </div>
            </div>
             <div className="space-y-2">
                {allPlayers.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-surface dark:bg-slate-700/50 rounded-md gap-2">
                        <input
                            type="text"
                            defaultValue={player.name}
                            onBlur={e => handleUpdatePlayer(player.id, 'name', e.target.value)}
                            className={inputClasses}
                        />
                        <input
                            type="number"
                            defaultValue={player.jerseyNumber}
                            onBlur={e => handleUpdatePlayer(player.id, 'jerseyNumber', parseInt(e.target.value, 10) || 0)}
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
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg text-sm flex items-start gap-2">
                <InformationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{translate('manageTournament.players.liveSaveInfo')}</span>
            </div>
            <div className="flex items-center space-x-2">
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder={translate('manageTournament.teamName.placeholder')} className={inputClasses} />
                <Button type="button" onClick={handleAddTeam}><PlusIcon className="w-5 h-5 mr-1"/>{translate('manageTournament.button.addTeam')}</Button>
            </div>
            <div className="space-y-4">
                {teams.map(team => {
                     const teamMemberIds = new Set(team.members.map(m => m.playerId));
                     const availablePlayersForDropdown = availablePlayersForLookup.filter(p => !teamMemberIds.has(p.id));

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

                            {/* Crest. Left unset, a team whose name matches one we
                                ship art for still gets that art automatically, so
                                this is only needed to override or to give a crest
                                to a name we do not know. */}
                            <TeamLogoPicker
                                teamName={team.name}
                                value={team.logoUrl}
                                onChange={logoUrl => setTeams(prev => prev.map(t => t.id === team.id ? { ...t, logoUrl } : t))}
                            />
                            <div className="space-y-2 mb-2">
                                {team.members.map(memberRef => {
                                    const member = availablePlayersForLookup.find(p => p.id === memberRef.playerId);
                                    if (!member) return <div key={memberRef.playerId} className="flex items-center justify-between text-sm bg-surface dark:bg-slate-700 p-2 rounded text-red-500 italic">Cầu thủ đã bị xóa</div>;
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
                                    {availablePlayersForDropdown.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.jerseyNumber})</option>)}
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
            <div onSubmit={(e) => e.preventDefault()}>
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
                        {isSaving ? <LoadingSpinner size="sm" /> : translate('manageTournament.button.saveTeams')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};