
import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { Tournament, TournamentTeam, TournamentMember } from '../../types';
import { updateTournament, onTeamDivisionUpdate } from '../../services/firebaseService';
import { TOURNAMENT_DOC_ID } from '../../constants';
import { PlusIcon, XIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface ManageTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

export const ManageTournamentModal: React.FC<ManageTournamentModalProps> = ({ isOpen, onClose, tournament: initialTournament }) => {
    const { translate } = useLanguage();
    const { currentUser, addToast } = useAppContext();

    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [teamDividerNames, setTeamDividerNames] = useState<string[]>([]);
    const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});
    const [newTeamName, setNewTeamName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const currentTeams = initialTournament ? JSON.parse(JSON.stringify(initialTournament.teams)) : [];
            setTeams(currentTeams);
            setTournamentName(initialTournament?.name || 'V-League Season 1');
            
            const unsubscribe = onTeamDivisionUpdate((data) => {
                if (data && data.seedPlayers) {
                    const allNames = Object.values(data.seedPlayers)
                        .flatMap(namesStr => namesStr.split('\n'))
                        .map(name => name.trim())
                        .filter(name => name);
                    const uniqueNames = [...new Set(allNames)];
                    setTeamDividerNames(uniqueNames);
                }
            });
            
            return () => unsubscribe();
        }
    }, [isOpen, initialTournament]);

    const handleAddTeam = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!newTeamName.trim()) {
            addToast(translate('manageTournament.error.teamNameRequired'), 'error', true);
            return;
        }
        if (teams.some(t => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
            addToast(translate('manageTournament.error.teamNameExists'), 'error', true);
            return;
        }
        const newTeam: TournamentTeam = {
            id: `team_${Date.now()}`,
            name: newTeamName.trim(),
            members: [],
        };
        setTeams(prev => [...prev, newTeam]);
        setNewTeamName('');
    };
    
    const handleRemoveTeam = (teamId: string) => {
        setTeams(prev => prev.filter(t => t.id !== teamId));
    };

    const handleAddMember = (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>, teamId: string) => {
        e.preventDefault();
        const name = memberInputs[teamId]?.trim();
        if (!name) return;

        const team = teams.find(t => t.id === teamId);
        if (team && team.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
            addToast(translate('manageTournament.error.memberNameExists'), 'error', true);
            return;
        }
        
        const newMember: TournamentMember = {
            id: `member_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: name,
        };
        
        setTeams(prev => prev.map(t => {
                if (t.id === teamId) {
                    return { ...t, members: [...t.members, newMember] };
                }
                return t;
            })
        );
        
        setMemberInputs(prev => ({...prev, [teamId]: ''}));
    };
    
    const handleRemoveMember = (teamId: string, memberId: string) => {
        setTeams(prev => prev.map(t => {
                if (t.id === teamId) {
                    return { ...t, members: t.members.filter(m => m.id !== memberId) };
                }
                return t;
            })
        );
    };
    
    const handleMemberInputChange = (teamId: string, value: string) => {
        setMemberInputs(prev => ({...prev, [teamId]: value}));
    };

    const handleSaveChanges = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            const dataToSave: Partial<Tournament> = { name: tournamentName, teams };
            // If this is the first time setup, initialize schedule and standings
            if (!initialTournament) {
                dataToSave.schedule = [];
                dataToSave.standings = [];
            }

            await updateTournament(TOURNAMENT_DOC_ID, dataToSave, currentUser);
            addToast(translate('manageTournament.saveSuccess'), 'success', true);
            onClose();
        } catch (error) {
            addToast(translate('manageTournament.saveError', { error: (error as Error).message }), 'error', true);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const modalTitle = initialTournament ? translate('manageTournament.title') : translate('manageTournament.createTitle');
    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
            <form onSubmit={(e) => e.preventDefault()}>
                <datalist id="player-suggestions">
                    {teamDividerNames.map(name => <option key={name} value={name} />)}
                </datalist>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="flex items-center space-x-2">
                        <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder={translate('manageTournament.teamName.placeholder')} className={inputClasses} />
                        <Button type="button" onClick={handleAddTeam}><PlusIcon className="w-5 h-5 mr-1"/>{translate('manageTournament.button.addTeam')}</Button>
                    </div>
                    <div className="space-y-4">
                        {teams.map(team => (
                            <div key={team.id} className="p-3 bg-background dark:bg-slate-800 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold">{team.name}</h4>
                                    <Button type="button" onClick={() => handleRemoveTeam(team.id)} variant="danger" size="sm"><XIcon className="w-4 h-4"/>{translate('manageTournament.button.removeTeam')}</Button>
                                </div>
                                <div className="space-y-2">
                                    {team.members.map(member => (
                                        <div key={member.id} className="flex items-center justify-between text-sm bg-surface dark:bg-slate-700 p-2 rounded">
                                            <span>{member.name}</span>
                                            <Button type="button" onClick={() => handleRemoveMember(team.id, member.id)} variant="ghost" size="sm" className="!p-1"><XIcon className="w-4 h-4 text-danger"/></Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                    <input
                                        type="text"
                                        list="player-suggestions"
                                        value={memberInputs[team.id] || ''}
                                        onChange={(e) => handleMemberInputChange(team.id, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { handleAddMember(e, team.id); } }}
                                        placeholder={translate('manageTournament.addMemberPlaceholder')}
                                        className={`${inputClasses} text-sm`}
                                    />
                                    <Button type="button" onClick={(e) => handleAddMember(e, team.id)} size="sm">{translate('manageTournament.button.addMember')}</Button>
                                </div>
                            </div>
                        ))}
                    </div>
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
