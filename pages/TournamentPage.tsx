import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import {
    onTournamentUpdate,
    updateTournament,
    getAllTournaments,
    createTournament,
    deleteTournament,
    onAllPlayersUpdate
} from '../services/firebaseService';
import { Tournament, TeamStanding, TournamentMatch, TournamentTeam, UserRole, Goal, TournamentPlayer } from '../types';
import { TOURNAMENT_DOC_ID } from '../constants';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { PencilAltIcon, TrophyIcon, UsersIcon, CalendarIcon, TableCellsIcon, UserCircleIcon, PlusCircleIcon, ArrowPathIcon, TShirtIcon, StarIcon, PlusIcon as PlusSmallIcon, TrashIcon, PencilIcon } from '../components/icons';
import { ManageTournamentModal } from '../components/Tournament/ManageTournamentModal';
import { TournamentScheduleGeneratorModal } from '../components/Tournament/TournamentScheduleGeneratorModal';
import { TournamentJerseyDrawModal } from '../components/Tournament/TournamentJerseyDrawModal';
import { GoalscorerModal } from '../components/Tournament/GoalscorerModal';
import { TopScorersList } from '../components/Tournament/TopScorersList';
import { CreateEditTournamentModal } from '../components/Tournament/CreateEditTournamentModal';


const TeamDisplay = ({ teamId, alignment = 'start', teams }: { teamId: string, alignment?: 'start' | 'end', teams: TournamentTeam[] }) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return <div className="w-full md:w-2/5 text-center font-semibold text-textPrimary">Unknown Team</div>;

    const teamColor = team.color || '#a1a1aa'; // default slate-400
    const alignClass = alignment === 'end' ? 'md:flex-row-reverse' : 'md:flex-row';
    const textAlign = alignment === 'end' ? 'md:text-right' : 'md:text-left';

    return (
        <div className={`flex items-center justify-center ${textAlign} w-full md:w-2/5 font-semibold text-textPrimary ${alignClass} gap-3`}>
            <div style={{ backgroundColor: teamColor }} className={`w-1 h-4 rounded-full flex-shrink-0`}></div>
            <span>{team.name}</span>
        </div>
    );
};

export const TournamentPage: React.FC = () => {
    const { translate, language } = useLanguage();
    const { currentUser, isFirebaseReady, addToast, canEdit } = useAppContext();

    const [allTournaments, setAllTournaments] = useState<{ id: string; name: string }[]>([]);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSwitchingTournament, setIsSwitchingTournament] = useState(false);
    const [isListLoading, setIsListLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'standings' | 'schedule' | 'teams' | 'topScorers'>('standings');
    
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [isJerseyDrawModalOpen, setIsJerseyDrawModalOpen] = useState(false);
    const [isGoalscorerModalOpen, setIsGoalscorerModalOpen] = useState(false);
    const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
    
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingMatchInfo, setEditingMatchInfo] = useState<{ match: TournamentMatch; teamType: 'home' | 'away' } | null>(null);

    // Effect for fetching the list of all tournaments
    const fetchAllTournaments = useCallback(async () => {
        if (!isFirebaseReady) return;
        setIsListLoading(true);
        try {
            const tournamentsList = await getAllTournaments();
            setAllTournaments(tournamentsList);
            if (tournamentsList.length > 0) {
                const storedId = localStorage.getItem('selectedTournamentId');
                if (storedId && tournamentsList.some(t => t.id === storedId)) {
                    setSelectedTournamentId(storedId);
                } else {
                    const defaultTournament = tournamentsList.find(t => t.id === TOURNAMENT_DOC_ID) || tournamentsList[0];
                    setSelectedTournamentId(defaultTournament.id);
                }
            } else {
                setSelectedTournamentId(null);
            }
        } catch (error) {
            addToast('tournament.toast.fetchListError', 'error');
            console.error("Failed to fetch tournaments list", error);
        } finally {
            setIsListLoading(false);
        }
    }, [isFirebaseReady, addToast]);

    useEffect(() => {
        fetchAllTournaments();
    }, [fetchAllTournaments]);

    // Effect for subscribing to the selected tournament's data
    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setTournament(null);
            setIsLoading(false);
            return;
        }

        setIsSwitchingTournament(true);
        console.log(`[TournamentPage] Subscribing to tournament: ${selectedTournamentId}`);
        const unsubscribe = onTournamentUpdate(selectedTournamentId, (data) => {
            setTournament(data);
            setIsLoading(false);
            setIsSwitchingTournament(false);
        });
        
        localStorage.setItem('selectedTournamentId', selectedTournamentId);

        return () => {
            console.log(`[TournamentPage] Unsubscribing from tournament: ${selectedTournamentId}`);
            unsubscribe();
        };
    }, [isFirebaseReady, selectedTournamentId]);

    // Effect for subscribing to the global player list
    useEffect(() => {
        if (!isFirebaseReady) return;
        const unsubscribe = onAllPlayersUpdate(setAllPlayers);
        return () => unsubscribe();
    }, [isFirebaseReady]);

    const availablePlayersForTournament = useMemo(() => {
        const legacyPlayers = tournament?.players ?? [];
        const combinedPlayers = new Map<string, TournamentPlayer>();

        // Add legacy players first
        for (const player of legacyPlayers) {
            if (player && player.id) {
                combinedPlayers.set(player.id, player);
            }
        }

        // Overwrite with global players, ensuring they take precedence
        for (const player of allPlayers) {
            if (player && player.id) {
                combinedPlayers.set(player.id, player);
            }
        }
        
        return Array.from(combinedPlayers.values());
    }, [tournament, allPlayers]);
    
    const calculateStandings = (teams: TournamentTeam[], schedule: TournamentMatch[]): TeamStanding[] => {
        const standingsMap: { [teamId: string]: TeamStanding } = {};

        teams.forEach(team => {
            standingsMap[team.id] = { teamId: team.id, teamName: team.name, logoUrl: team.logoUrl ?? null, teamColor: team.color ?? null, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
        });

        schedule.forEach(match => {
            const homeScore = match.homeTeamGoals?.length ?? match.homeTeamScore;
            const awayScore = match.awayTeamGoals?.length ?? match.awayTeamScore;

            if (match.status !== 'finished' || typeof homeScore !== 'number' || typeof awayScore !== 'number') return;

            const home = standingsMap[match.homeTeamId];
            const away = standingsMap[match.awayTeamId];

            if (!home || !away) return;

            home.played++; away.played++;
            home.goalsFor += homeScore; away.goalsFor += awayScore;
            home.goalsAgainst += awayScore; away.goalsAgainst += homeScore;
            
            if (homeScore > awayScore) { home.wins++; away.losses++; home.points += 3;
            } else if (homeScore < awayScore) { away.wins++; home.losses++; away.points += 3;
            } else { home.draws++; away.draws++; home.points += 1; away.points += 1; }
        });
        
        const standingsArray = Object.values(standingsMap).map(s => ({...s, goalDifference: s.goalsFor - s.goalsAgainst}));

        standingsArray.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            return a.teamName.localeCompare(b.teamName);
        });
        
        return standingsArray;
    };
    
    const topScorers = useMemo(() => {
        if (!tournament?.schedule || !tournament?.teams || !availablePlayersForTournament) return [];
        const scorerStats: Record<string, { name: string; goals: number; teamId: string; isGuest: boolean; jerseyNumber?: number; }> = {};

        tournament.schedule.forEach(match => {
            const processGoals = (goals: Goal[] = [], teamId: string) => {
                goals.forEach(goal => {
                    const key = goal.scorerId ? goal.scorerId : `guest_${goal.scorerName}`;
                    if (!scorerStats[key]) {
                        const player = goal.scorerId ? availablePlayersForTournament.find(p => p.id === goal.scorerId) : undefined;
                        scorerStats[key] = { name: goal.scorerName, goals: 0, teamId: teamId, isGuest: !goal.scorerId, jerseyNumber: player?.jerseyNumber };
                    }
                    scorerStats[key].goals++;
                    scorerStats[key].teamId = teamId;
                });
            };
            processGoals(match.homeTeamGoals, match.homeTeamId);
            processGoals(match.awayTeamGoals, match.awayTeamId);
        });

        return Object.values(scorerStats).map(stats => ({ ...stats, teamName: tournament.teams.find(t => t.id === stats.teamId)?.name || '?' }))
            .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    }, [tournament, availablePlayersForTournament]);

    const handleCreateTournament = async (name: string) => {
        if (!currentUser) return;
        try {
            const newTournamentId = await createTournament(name, currentUser);
            addToast('tournament.toast.createdSuccess', 'success', { name });
            await fetchAllTournaments();
            setSelectedTournamentId(newTournamentId);
            setIsCreateEditModalOpen(false);
        } catch (error) {
            addToast('tournament.toast.createError', 'error', { message: (error as Error).message });
        }
    };
    
    const handleEditTournament = async (newName: string) => {
        if (!currentUser || !tournament) return;
        try {
            await updateTournament(tournament.id, { name: newName }, currentUser);
            addToast('tournament.toast.updatedSuccess', 'success');
            await fetchAllTournaments();
            setIsCreateEditModalOpen(false);
        } catch (error) {
            addToast('tournament.toast.updateError', 'error', { message: (error as Error).message });
        }
    };
    
    const handleDeleteTournament = async () => {
        if (!tournament) return;
        const confirmDelete = window.confirm(translate('tournament.deleteConfirm.message', { name: tournament.name }));
        if (!confirmDelete) return;

        try {
            await deleteTournament(tournament.id);
            addToast('tournament.toast.deletedSuccess', 'success', { name: tournament.name });
            setTournament(null);
            await fetchAllTournaments();
        } catch (error) {
            addToast('tournament.toast.deleteError', 'error', { message: (error as Error).message });
        }
    };

    const handleOpenGoalscorerModal = (match: TournamentMatch, teamType: 'home' | 'away') => {
        if (!canEdit) return;
        setEditingMatchInfo({ match, teamType });
        setIsGoalscorerModalOpen(true);
    };

    const handleSaveGoals = async (matchId: string, teamType: 'home' | 'away', goals: Goal[]) => {
        if (!currentUser || !tournament) return;
        setIsLoading(true);

        const newSchedule = tournament.schedule.map(match => {
            if (match.id === matchId) {
                const updatedMatch = { ...match };
                if (teamType === 'home') { updatedMatch.homeTeamGoals = goals; updatedMatch.homeTeamScore = goals.length; } 
                else { updatedMatch.awayTeamGoals = goals; updatedMatch.awayTeamScore = goals.length; }
                updatedMatch.status = (updatedMatch.homeTeamScore !== null && updatedMatch.awayTeamScore !== null) ? 'finished' : 'scheduled';
                return updatedMatch;
            }
            return match;
        });

        const newStandings = calculateStandings(tournament.teams, newSchedule);
        
        try {
            await updateTournament(tournament.id, { schedule: newSchedule, standings: newStandings }, currentUser);
            addToast('tournament.success.updateMatch', 'success');
            setIsGoalscorerModalOpen(false);
        } catch (error) {
            addToast('tournament.error.updateMatchGeneric', 'error', { message: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveGeneratedSchedule = async (schedule: TournamentMatch[]) => {
        if (!tournament || !currentUser) return;
        setIsLoading(true);
        try {
            const newStandings = calculateStandings(tournament.teams, schedule);
            await updateTournament(tournament.id, { schedule, standings: newStandings }, currentUser);
            addToast('tournament.success.saveSchedule', 'success');
            setIsGeneratorModalOpen(false);
        } catch(error) {
            addToast('tournament.error.saveScheduleGeneric', 'error', { message: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveJerseys = async (updatedTeams: TournamentTeam[]) => {
        if (!tournament || !currentUser) return;
        setIsLoading(true);
        try {
            await updateTournament(tournament.id, { teams: updatedTeams }, currentUser);
            addToast('manageTournament.saveSuccess', 'success');
            setIsJerseyDrawModalOpen(false);
        } catch(error) {
            addToast('manageTournament.saveError', 'error', { error: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !tournament) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4 text-textPrimary">{translate('tournament.loading')}</p></div>;
    }

    const panelClasses = "bg-surface shadow-lg rounded-lg";

    const renderContent = () => {
        if (isSwitchingTournament) {
             return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4 text-textPrimary">{translate('tournament.loading')}</p></div>;
        }

        if (!tournament) {
            return (
                <div className="text-center py-10">
                    <p className="text-textSecondary">{translate('tournament.noData')}</p>
                    {canEdit && (
                         <Button onClick={() => { setModalMode('create'); setIsCreateEditModalOpen(true); }} className="mt-4">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            {translate('tournament.button.new')}
                        </Button>
                    )}
                </div>
            );
        }
        
        const { name, teams, schedule, standings, lastUpdated, updatedBy } = tournament;
        
        const tabs = [
            { id: 'standings', label: 'tournament.tab.standings', icon: <TableCellsIcon className="w-5 h-5" /> },
            { id: 'schedule', label: 'tournament.tab.schedule', icon: <CalendarIcon className="w-5 h-5" /> },
            { id: 'teams', label: 'tournament.tab.teams', icon: <UsersIcon className="w-5 h-5" /> },
            { id: 'topScorers', label: 'tournament.tab.topScorers', icon: <StarIcon className="w-5 h-5" /> },
        ] as const;


        return (
            <div className="space-y-6 animate-fadeIn">
                <header className="relative text-center">
                    <div className="bg-surface backdrop-blur-sm p-4 rounded-xl shadow-lg inline-block border border-border">
                        <h1 className="text-3xl sm:text-4xl font-bold text-textPrimary tracking-tight">{name}</h1>
                        {lastUpdated && updatedBy && (
                            <p className="text-xs text-textSecondary mt-2">{translate('tournament.lastUpdated', { name: updatedBy.name, date: new Date(lastUpdated).toLocaleString(language) })}</p>
                        )}
                    </div>
                </header>
                 {canEdit && (
                    <div className={`${panelClasses} p-3`}>
                        <h2 className="text-lg font-semibold mb-2 text-textPrimary">{translate('tournament.generateScheduleSectionTitle')}</h2>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setIsGeneratorModalOpen(true)} disabled={!tournament || tournament.teams.length < 2} size="sm">
                                <ArrowPathIcon className="w-4 h-4 mr-2" />
                                {translate('tournament.button.generateSchedule')}
                            </Button>
                            <Button onClick={() => setIsJerseyDrawModalOpen(true)} disabled={!tournament || tournament.teams.length < 2} variant="secondary" size="sm">
                                <TShirtIcon className="w-4 h-4 mr-2" />
                                {translate('tournament.button.drawJerseys')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="border-b border-border">
                    <nav className="-mb-px flex flex-wrap gap-x-2 sm:gap-x-4" aria-label="Tabs">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-textSecondary hover:border-gray-300 dark:hover:border-slate-600 hover:text-textPrimary'
                                }`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{translate(tab.label)}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-4">
                    {activeTab === 'standings' && (
                        <section>
                            <div className={`${panelClasses} overflow-hidden`}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-100 dark:bg-slate-800">
                                            <tr>
                                                <th scope="col" className="w-1/3 pl-4 pr-3 py-3.5 text-left text-sm font-semibold text-textPrimary sm:pl-6">{translate('standingsTable.team')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.played')}>{translate('standingsTable.played')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.wins')}>{translate('standingsTable.wins')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.draws')}>{translate('standingsTable.draws')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.losses')}>{translate('standingsTable.losses')}</th>
                                                <th scope="col" className="hidden lg:table-cell px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.gf')}>{translate('standingsTable.gf')}</th>
                                                <th scope="col" className="hidden lg:table-cell px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.ga')}>{translate('standingsTable.ga')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.gd')}>{translate('standingsTable.gd')}</th>
                                                <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.points')}>{translate('standingsTable.points')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-surface">
                                            {standings?.map((s, index) => (
                                                <tr key={s.teamId} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                        <div className="flex items-center">
                                                            <span className="w-6 text-center mr-3 font-bold text-lg text-textSecondary">{index + 1}</span>
                                                            <div style={{ backgroundColor: s.teamColor || '#a1a1aa' }} className="w-1.5 h-6 rounded-full mr-4 flex-shrink-0 shadow-sm"></div>
                                                            <div className="font-semibold text-base text-textPrimary">{s.teamName}</div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-medium text-textSecondary">{s.played}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-semibold text-green-600 dark:text-green-500">{s.wins}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-semibold text-yellow-600 dark:text-yellow-500">{s.draws}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-semibold text-red-600 dark:text-red-500">{s.losses}</td>
                                                    <td className="whitespace-nowrap hidden lg:table-cell px-2 py-4 text-center text-sm text-textSecondary">{s.goalsFor}</td>
                                                    <td className="whitespace-nowrap hidden lg:table-cell px-2 py-4 text-center text-sm text-textSecondary">{s.goalsAgainst}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-bold text-textPrimary">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-center"><span className="inline-block bg-primary text-white text-base font-bold px-3 py-1 rounded-md shadow-md">{s.points}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                    {activeTab === 'schedule' && (
                        <section className="space-y-6">
                            {schedule?.length > 0 ? [...new Set(schedule.map(m => m.round))].sort((a,b) => a-b).map(roundNum => (
                                <div key={roundNum}>
                                    <h3 className="text-lg font-semibold text-textSecondary mb-2">{translate('schedule.round', { round: roundNum })}</h3>
                                    <div className="space-y-3">
                                        {schedule.filter(m => m.round === roundNum).map(match => (
                                            <div key={match.id} className={`${panelClasses} p-3 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4`}>
                                                <TeamDisplay teamId={match.homeTeamId} alignment="end" teams={teams} />
                                                <div className="flex flex-col items-center justify-center my-2 md:my-0">
                                                    {canEdit ? (
                                                        <div className="flex items-center space-x-2">
                                                            <button onClick={() => handleOpenGoalscorerModal(match, 'home')} className="w-20 sm:w-24 text-xl font-bold text-center text-textPrimary bg-background border border-border rounded-lg p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-primary/50 transition-all shadow-sm" title={translate('schedule.updateScoreTitle')}>{match.homeTeamScore ?? '-'}</button>
                                                            <span className="font-bold text-lg text-textSecondary">-</span>
                                                            <button onClick={() => handleOpenGoalscorerModal(match, 'away')} className="w-20 sm:w-24 text-xl font-bold text-center text-textPrimary bg-background border border-border rounded-lg p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-primary/50 transition-all shadow-sm" title={translate('schedule.updateScoreTitle')}>{match.awayTeamScore ?? '-'}</button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xl font-bold px-3 py-1 text-textPrimary bg-background rounded-md">{match.status === 'finished' ? `${match.homeTeamScore ?? '-'} - ${match.awayTeamScore ?? '-'}` : 'vs'}</span>
                                                    )}
                                                </div>
                                                <TeamDisplay teamId={match.awayTeamId} alignment="start" teams={teams} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )) : <div className={`${panelClasses} p-4`}><p className="text-textSecondary text-center py-4">{translate('schedule.noMatches')}</p></div>}
                        </section>
                    )}
                    {activeTab === 'teams' && (
                         <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams?.map(team => (
                                <div key={team.id} className={panelClasses}>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg text-primary mb-2 flex items-center gap-3"><div style={{ backgroundColor: team.color || '#a1a1aa' }} className="w-1 h-4 rounded-full flex-shrink-0"></div>{team.name}</h3>
                                        <h4 className="font-semibold text-sm text-textPrimary mb-1">{translate('teamList.members')}</h4>
                                        <ul className="space-y-1">
                                            {team.members?.map(memberRef => {
                                                const player = availablePlayersForTournament.find(p => p.id === memberRef.playerId);
                                                return (
                                                    <li key={memberRef.playerId} className="flex items-center text-sm p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700/60 text-textPrimary">
                                                        <UserCircleIcon className="w-6 h-6 text-textSecondary mr-2"/>
                                                        {player ? (
                                                            <span>{player.name} (#{player.jerseyNumber})</span>
                                                        ) : (
                                                            <span className="italic text-textSecondary text-xs">(Cầu thủ đã bị xóa)</span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                            {(!team.members || team.members.length === 0) && <p className="text-xs text-textSecondary italic">{translate('teamList.noMembers')}</p>}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}
                    {activeTab === 'topScorers' && (
                        <section><div className={panelClasses}><TopScorersList scorers={topScorers} teams={teams} /></div></section>
                    )}
                </div>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
                `}</style>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className={`${panelClasses} p-3`}>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-grow">
                         <label htmlFor="tournament-select" className="sr-only">{translate('tournament.selectTournament')}</label>
                         <select
                            id="tournament-select"
                            value={selectedTournamentId || ''}
                            onChange={e => setSelectedTournamentId(e.target.value)}
                            disabled={isListLoading}
                            className="w-full max-w-xs block px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400"
                        >
                            {isListLoading ? <option>{translate('tournament.loading')}</option> : allTournaments.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2">
                             <Button onClick={() => { setModalMode('create'); setIsCreateEditModalOpen(true); }} size="sm"><PlusSmallIcon className="w-4 h-4 mr-1"/>{translate('tournament.button.new')}</Button>
                             <Button onClick={() => { setModalMode('edit'); setIsCreateEditModalOpen(true); }} size="sm" variant="outline" disabled={!tournament}><PencilIcon className="w-4 h-4 mr-1"/>{translate('tournament.button.edit')}</Button>
                             <Button onClick={handleDeleteTournament} size="sm" variant="danger" disabled={!tournament || allTournaments.length <= 1}><TrashIcon className="w-4 h-4 mr-1"/>{translate('tournament.button.delete')}</Button>
                             <Button onClick={() => setIsManageModalOpen(true)} size="sm" disabled={!tournament}><PencilAltIcon className="w-4 h-4 mr-1" />{translate('tournament.manageButton')}</Button>
                        </div>
                    )}
                </div>
            </div>

            {renderContent()}

            {isManageModalOpen && canEdit && tournament && (
                <ManageTournamentModal 
                    isOpen={isManageModalOpen} 
                    onClose={() => setIsManageModalOpen(false)} 
                    tournament={tournament}
                    allPlayers={allPlayers}
                    availablePlayersForLookup={availablePlayersForTournament}
                />
            )}
            {isCreateEditModalOpen && canEdit && (
                 <CreateEditTournamentModal isOpen={isCreateEditModalOpen} onClose={() => setIsCreateEditModalOpen(false)} mode={modalMode} initialName={modalMode === 'edit' ? tournament?.name : ''} onSubmit={modalMode === 'create' ? handleCreateTournament : handleEditTournament} />
            )}
            {isGeneratorModalOpen && tournament && (
                <TournamentScheduleGeneratorModal isOpen={isGeneratorModalOpen} onClose={() => setIsGeneratorModalOpen(false)} teams={tournament.teams} onSave={handleSaveGeneratedSchedule} />
            )}
            {isJerseyDrawModalOpen && tournament && (
                <TournamentJerseyDrawModal isOpen={isJerseyDrawModalOpen} onClose={() => setIsJerseyDrawModalOpen(false)} teams={tournament.teams} onSave={handleSaveJerseys} />
            )}
            {isGoalscorerModalOpen && editingMatchInfo && tournament && canEdit && (
                <GoalscorerModal isOpen={isGoalscorerModalOpen} onClose={() => setIsGoalscorerModalOpen(false)} match={editingMatchInfo.match} teamType={editingMatchInfo.teamType} allTeams={tournament.teams} allPlayers={availablePlayersForTournament} onSave={handleSaveGoals} />
            )}
        </div>
    );
};
