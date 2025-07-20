import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage, useAppContext } from '../../App';
import { Tournament, TournamentTeam, User, UserRole, TournamentMember, TournamentMatch } from '../../types';
import { updateTournament, getAllAppUsers } from '../../services/firebaseService';
import { TOURNAMENT_DOC_ID } from '../../constants';
import { PlusIcon, XIcon, UsersIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface ManageTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

type Tab = 'teams' | 'schedule';

export const ManageTournamentModal: React.FC<ManageTournamentModalProps> = ({ isOpen, onClose, tournament: initialTournament }) => {
    const { translate } = useLanguage();
    const { currentUser, addToast } = useAppContext();

    const [activeTab, setActiveTab] = useState<Tab>('teams');
    const [tournamentData, setTournamentData] = useState<Partial<Tournament>>({});
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTournamentData(initialTournament ? JSON.parse(JSON.stringify(initialTournament)) : { name: 'V-League Season 1', teams: [], schedule: [], standings: [] });
            
            const fetchUsers = async () => {
                if (currentUser?.role === UserRole.ADMIN) {
                    const users = await getAllAppUsers();
                    setAllUsers(users);
                }
            };
            fetchUsers();
        }
    }, [isOpen, initialTournament, currentUser]);

    const handleAddTeam = () => {
        if (!newTeamName.trim()) {
            addToast(translate('manageTournament.error.teamNameRequired'), 'error', true);
            return;
        }
        if (tournamentData.teams?.some(t => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
            addToast(translate('manageTournament.error.teamNameExists'), 'error', true);
            return;
        }
        const newTeam: TournamentTeam = {
            id: `team_${Date.now()}`,
            name: newTeamName.trim(),
            members: [],
        };
        setTournamentData(prev => ({ ...prev, teams: [...(prev.teams || []), newTeam] }));
        setNewTeamName('');
    };
    
    const handleRemoveTeam = (teamId: string) => {
        setTournamentData(prev => ({ ...prev, teams: prev.teams?.filter(t => t.id !== teamId) }));
    };

    const handleAddMember = (teamId: string, userId: string) => {
        const userToAdd = allUsers.find(u => u.id === userId);
        if (!userToAdd) return;

        const newMember: TournamentMember = {
            userId: userToAdd.id,
            name: userToAdd.name,
            avatarUrl: userToAdd.avatarUrl,
        };
        
        setTournamentData(prev => ({
            ...prev,
            teams: prev.teams?.map(t => {
                if (t.id === teamId && !t.members.some(m => m.userId === userId)) {
                    return { ...t, members: [...t.members, newMember] };
                }
                return t;
            })
        }));
    };
    
    const handleRemoveMember = (teamId: string, userId: string) => {
        setTournamentData(prev => ({
            ...prev,
            teams: prev.teams?.map(t => {
                if (t.id === teamId) {
                    return { ...t, members: t.members.filter(m => m.userId !== userId) };
                }
                return t;
            })
        }));
    };

    const handleGenerateSchedule = () => {
        if (!tournamentData.teams || tournamentData.teams.length < 2) {
            addToast(translate('manageTournament.error.minTeamsForSchedule'), 'error', true);
            return;
        }

        const teams = [...tournamentData.teams];
        if (teams.length % 2 !== 0) {
            teams.push({ id: 'bye', name: 'BYE', members: [] });
        }
        
        const numRounds = (teams.length - 1) * 2; // Double round-robin
        const matchesPerRound = teams.length / 2;
        const newSchedule: TournamentMatch[] = [];

        for (let round = 0; round < numRounds; round++) {
            for (let i = 0; i < matchesPerRound; i++) {
                const home = teams[i];
                const away = teams[teams.length - 1 - i];

                if (home.id === 'bye' || away.id === 'bye') continue;
                
                // Alternate home/away for the second half of the season
                const isSecondHalf = round >= (numRounds / 2);
                const homeTeamId = (isSecondHalf) ? away.id : home.id;
                const awayTeamId = (isSecondHalf) ? home.id : away.id;

                newSchedule.push({
                    id: `match_${Date.now()}_${round}_${i}`,
                    round: round + 1,
                    homeTeamId,
                    awayTeamId,
                    status: 'scheduled',
                });
            }
             // Rotate teams, keeping the first team fixed
            const lastTeam = teams.pop()!;
            teams.splice(1, 0, lastTeam);
        }
        setTournamentData(prev => ({ ...prev, schedule: newSchedule }));
        addToast('Schedule generated!', 'success');
    };

    const handleSaveChanges = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await updateTournament(TOURNAMENT_DOC_ID, tournamentData, currentUser);
            addToast(translate('manageTournament.saveSuccess'), 'success', true);
            onClose();
        } catch (error) {
            addToast(translate('manageTournament.saveError', { error: (error as Error).message }), 'error', true);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={translate('manageTournament.title')} size="xl">
            <div className="flex flex-col space-y-4">
                <div className="border-b border-border flex">
                    <button onClick={() => setActiveTab('teams')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'teams' ? 'border-b-2 border-primary text-primary' : 'text-textSecondary hover:bg-primary/10'}`}>{translate('manageTournament.tab.teams')}</button>
                    <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-textSecondary hover:bg-primary/10'}`}>{translate('manageTournament.tab.schedule')}</button>
                </div>
                
                {activeTab === 'teams' && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder={translate('manageTournament.teamName.placeholder')} className={inputClasses} />
                            <Button onClick={handleAddTeam}><PlusIcon className="w-5 h-5 mr-1"/>{translate('manageTournament.button.addTeam')}</Button>
                        </div>
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                            {tournamentData.teams?.map(team => (
                                <div key={team.id} className="p-3 bg-background dark:bg-slate-800 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold">{team.name}</h4>
                                        <Button onClick={() => handleRemoveTeam(team.id)} variant="danger" size="sm"><XIcon className="w-4 h-4"/>{translate('manageTournament.button.removeTeam')}</Button>
                                    </div>
                                    <div className="space-y-2">
                                        {team.members.map(member => (
                                            <div key={member.userId} className="flex items-center justify-between text-sm bg-surface dark:bg-slate-700 p-2 rounded">
                                                <span>{member.name}</span>
                                                <Button onClick={() => handleRemoveMember(team.id, member.userId)} variant="ghost" size="sm" className="!p-1"><XIcon className="w-4 h-4 text-danger"/></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <select onChange={(e) => handleAddMember(team.id, e.target.value)} value="" className={`${inputClasses} text-sm`}>
                                            <option value="" disabled>{translate('manageTournament.selectMember')}</option>
                                            {allUsers.filter(u => !team.members.some(m => m.userId === u.id)).map(user => (
                                                <option key={user.id} value={user.id}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {activeTab === 'schedule' && (
                    <div className="text-center space-y-4">
                         <p className="text-sm text-textSecondary">{translate('manageTournament.scheduleInfo')}</p>
                        <Button onClick={handleGenerateSchedule} variant="secondary" size="lg">
                            <UsersIcon className="w-5 h-5 mr-2" />
                            {translate('manageTournament.button.generateSchedule')}
                        </Button>
                    </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
                    <Button onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" /> : translate('manageTournament.button.saveChanges')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
