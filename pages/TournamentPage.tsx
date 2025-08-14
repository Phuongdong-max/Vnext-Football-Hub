import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, updateTournament } from '../services/firebaseService';
import { Tournament, TeamStanding, TournamentMatch, TournamentTeam, UserRole, Goal } from '../types';
import { TOURNAMENT_DOC_ID } from '../constants';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { PencilAltIcon, TrophyIcon, UsersIcon, CalendarIcon, TableCellsIcon, UserCircleIcon, PlusCircleIcon, ArrowPathIcon, TShirtIcon, StarIcon } from '../components/icons';
import { ManageTournamentModal } from '../components/Tournament/ManageTournamentModal';
import { TournamentScheduleGeneratorModal } from '../components/Tournament/TournamentScheduleGeneratorModal';
import { TournamentJerseyDrawModal } from '../components/Tournament/TournamentJerseyDrawModal';
import { GoalscorerModal } from '../components/Tournament/GoalscorerModal';
import { TopScorersList } from '../components/Tournament/TopScorersList';

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
    const { currentUser, isFirebaseReady, addToast } = useAppContext();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [isJerseyDrawModalOpen, setIsJerseyDrawModalOpen] = useState(false);

    const [isGoalscorerModalOpen, setIsGoalscorerModalOpen] = useState(false);
    const [editingMatchInfo, setEditingMatchInfo] = useState<{ match: TournamentMatch; teamType: 'home' | 'away' } | null>(null);

    // Effect for fetching data
    useEffect(() => {
        if (!isFirebaseReady) {
            setIsLoading(false);
            return;
        }

        console.log("[TournamentPage] Subscribing to tournament updates...");
        setIsLoading(true);
        const unsubscribe = onTournamentUpdate(TOURNAMENT_DOC_ID, (data) => {
            console.log("[TournamentPage] Received data from Firestore listener:", data);
            setTournament(data);
            setIsLoading(false);
        });
        
        return () => {
            console.log("[TournamentPage] Unsubscribing from tournament updates.");
            unsubscribe();
        };
    }, [isFirebaseReady]);
    
    const calculateStandings = (teams: TournamentTeam[], schedule: TournamentMatch[]): TeamStanding[] => {
        console.log("[TournamentPage] Starting standings calculation...");
        const standingsMap: { [teamId: string]: TeamStanding } = {};

        teams.forEach(team => {
            standingsMap[team.id] = {
                teamId: team.id,
                teamName: team.name,
                logoUrl: team.logoUrl ?? null,
                teamColor: team.color ?? null,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0,
            };
        });

        schedule.forEach(match => {
            const homeScore = match.homeTeamGoals?.length ?? match.homeTeamScore;
            const awayScore = match.awayTeamGoals?.length ?? match.awayTeamScore;

            if (match.status !== 'finished' || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
                 console.log(`[TournamentPage] Skipping match ${match.id} from standings (not finished).`);
                return;
            }

            const home = standingsMap[match.homeTeamId];
            const away = standingsMap[match.awayTeamId];

            if (!home || !away) {
                console.warn(`[TournamentPage] Skipping match ${match.id}: could not find one or both teams in standings map.`);
                return;
            }

            home.played++;
            away.played++;
            home.goalsFor += homeScore;
            away.goalsFor += awayScore;
            home.goalsAgainst += awayScore;
            away.goalsAgainst += homeScore;
            
            if (homeScore > awayScore) {
                home.wins++;
                away.losses++;
                home.points += 3;
            } else if (homeScore < awayScore) {
                away.wins++;
                home.losses++;
                away.points += 3;
            } else {
                home.draws++;
                away.draws++;
                home.points += 1;
                away.points += 1;
            }
        });
        
        const standingsArray = Object.values(standingsMap).map(s => ({...s, goalDifference: s.goalsFor - s.goalsAgainst}));

        standingsArray.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            return a.teamName.localeCompare(b.teamName);
        });
        
        console.log("[TournamentPage] Standings calculation finished.", standingsArray);
        return standingsArray;
    };
    
    const topScorers = useMemo(() => {
        if (!tournament?.schedule || !tournament?.teams) return [];

        const scorerStats: Record<string, {
            name: string;
            goals: number;
            teamId: string;
            isGuest: boolean;
        }> = {};

        tournament.schedule.forEach(match => {
            const processGoals = (goals: Goal[] = [], teamId: string) => {
                goals.forEach(goal => {
                    const key = goal.scorerId ? goal.scorerId : `guest_${goal.scorerName}`;
                    if (!scorerStats[key]) {
                        scorerStats[key] = { name: goal.scorerName, goals: 0, teamId: teamId, isGuest: !goal.scorerId };
                    }
                    scorerStats[key].goals++;
                    scorerStats[key].teamId = teamId;
                });
            };

            processGoals(match.homeTeamGoals, match.homeTeamId);
            processGoals(match.awayTeamGoals, match.awayTeamId);
        });

        const topScorersList = Object.values(scorerStats).map(stats => ({
            ...stats,
            teamName: tournament.teams.find(t => t.id === stats.teamId)?.name || '?',
        }));

        topScorersList.sort((a, b) => {
            if (b.goals !== a.goals) {
                return b.goals - a.goals;
            }
            return a.name.localeCompare(b.name);
        });

        return topScorersList;
    }, [tournament]);

    const handleOpenGoalscorerModal = (match: TournamentMatch, teamType: 'home' | 'away') => {
        if (!currentUser) return;
        setEditingMatchInfo({ match, teamType });
        setIsGoalscorerModalOpen(true);
    };

    const handleSaveGoals = async (matchId: string, teamType: 'home' | 'away', goals: Goal[]) => {
        if (!currentUser || !tournament) return;
        setIsLoading(true);

        const newSchedule = tournament.schedule.map(match => {
            if (match.id === matchId) {
                const newScore = goals.length;
                const updatedMatch = { ...match };

                if (teamType === 'home') {
                    updatedMatch.homeTeamGoals = goals;
                    updatedMatch.homeTeamScore = newScore;
                } else {
                    updatedMatch.awayTeamGoals = goals;
                    updatedMatch.awayTeamScore = newScore;
                }
                
                const homeScore = updatedMatch.homeTeamScore;
                const awayScore = updatedMatch.awayTeamScore;
                updatedMatch.status = (homeScore !== null && awayScore !== null) ? 'finished' : 'scheduled';
                return updatedMatch;
            }
            return match;
        });

        const newStandings = calculateStandings(tournament.teams, newSchedule);
        
        try {
            await updateTournament(TOURNAMENT_DOC_ID, { teams: tournament.teams, players: tournament.players, schedule: newSchedule, standings: newStandings }, currentUser);
            addToast('tournament.success.updateMatch', 'success');
            setIsGoalscorerModalOpen(false);
            setEditingMatchInfo(null);
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
            await updateTournament(TOURNAMENT_DOC_ID, { teams: tournament.teams, players: tournament.players, schedule, standings: newStandings }, currentUser);
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
            await updateTournament(TOURNAMENT_DOC_ID, { teams: updatedTeams, players: tournament.players }, currentUser);
            addToast('manageTournament.saveSuccess', 'success');
            setIsJerseyDrawModalOpen(false);
        } catch(error) {
            addToast('manageTournament.saveError', 'error', { error: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4 text-textPrimary">{translate('tournament.loading')}</p></div>;
    }

    const panelClasses = "bg-surface shadow-lg rounded-lg";
    
    if (!tournament) {
        return (
            <div className="text-center py-10">
                <p className="text-textSecondary">{translate('tournament.noData')}</p>
                {currentUser && (
                     <Button onClick={() => setIsManageModalOpen(true)} className="mt-4">
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.createButton')}
                    </Button>
                )}
                {isManageModalOpen && currentUser && (
                    <ManageTournamentModal
                        isOpen={isManageModalOpen}
                        onClose={() => setIsManageModalOpen(false)}
                        tournament={tournament}
                    />
                )}
            </div>
        );
    }
    
    const { name, teams, schedule, standings, lastUpdated, updatedBy, players } = tournament;
    
    return (
        <div className="space-y-12">
            <header className="relative text-center">
                <div className="bg-surface backdrop-blur-sm p-6 rounded-xl shadow-lg inline-block border border-border">
                    <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-primary" style={{ filter: 'drop-shadow(0 4px 8px rgba(253, 224, 71, 0.3))' }} />
                    <h1 className="text-4xl sm:text-5xl font-bold text-textPrimary tracking-tight">
                        {name || 'VNext Open Cup Season 1'}
                    </h1>
                     {lastUpdated && updatedBy && (
                        <p className="text-xs text-textSecondary mt-2">
                            {translate('tournament.lastUpdated', {
                                name: updatedBy.name,
                                date: new Date(lastUpdated).toLocaleString(language)
                            })}
                        </p>
                    )}
                </div>
                 {!!currentUser && (
                    <div className="absolute top-0 right-0">
                        <Button onClick={() => setIsManageModalOpen(true)}>
                            <PencilAltIcon className="w-5 h-5 mr-2" />
                            {translate('tournament.manageButton')}
                        </Button>
                    </div>
                )}
            </header>
            
            {!!currentUser && (
                <div className={`${panelClasses} p-4`}>
                    <h2 className="text-xl font-semibold mb-3 text-textPrimary">{translate('tournament.generateScheduleSectionTitle')}</h2>
                     <div className="flex flex-wrap gap-2">
                        <Button 
                          type="button" 
                          onClick={() => setIsGeneratorModalOpen(true)}
                          disabled={!tournament || tournament.teams.length < 2}
                        >
                            <ArrowPathIcon className="w-5 h-5 mr-2" />
                            {translate('tournament.button.generateSchedule')}
                        </Button>
                        <Button 
                          type="button" 
                          onClick={() => setIsJerseyDrawModalOpen(true)}
                          disabled={!tournament || tournament.teams.length < 2}
                          variant="secondary"
                        >
                            <TShirtIcon className="w-5 h-5 mr-2" />
                            {translate('tournament.button.drawJerseys')}
                        </Button>
                     </div>
                    {(!tournament || tournament.teams.length < 2) && (
                        <p className="text-xs text-yellow-400 mt-2">{translate('manageTournament.error.minTeamsForSchedule')}</p>
                    )}
                </div>
            )}

            {/* Standings */}
            <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center text-textPrimary"><TableCellsIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.standings')}</h2>
                <div className={`${panelClasses} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-gray-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('standingsTable.team')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.played')}>{translate('standingsTable.played')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.wins')}>{translate('standingsTable.wins')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.draws')}>{translate('standingsTable.draws')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.losses')}>{translate('standingsTable.losses')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.gf')}>{translate('standingsTable.gf')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.ga')}>{translate('standingsTable.ga')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.gd')}>{translate('standingsTable.gd')}</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.points')}>{translate('standingsTable.points')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {standings?.map((s, index) => (
                                    <tr key={s.teamId} className="hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors">
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-textPrimary font-medium">
                                                <span className="w-6 text-center mr-2 font-semibold text-textSecondary">{index + 1}</span>
                                                <div style={{ backgroundColor: s.teamColor || '#a1a1aa' }} className="w-1 h-4 rounded-full mr-3 flex-shrink-0"></div>
                                                {s.teamName}
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center text-textSecondary">{s.played}</td>
                                        <td className="px-2 py-4 text-center font-semibold text-green-500">{s.wins}</td>
                                        <td className="px-2 py-4 text-center font-semibold text-yellow-500">{s.draws}</td>
                                        <td className="px-2 py-4 text-center font-semibold text-red-500">{s.losses}</td>
                                        <td className="px-2 py-4 text-center text-textSecondary">{s.goalsFor}</td>
                                        <td className="px-2 py-4 text-center text-textSecondary">{s.goalsAgainst}</td>
                                        <td className="px-2 py-4 text-center font-semibold text-textSecondary">{s.goalDifference}</td>
                                        <td className="px-2 py-4 text-center font-extrabold text-primary bg-primary/10">{s.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Top Scorers */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center text-textPrimary">
                            <StarIcon className="w-6 h-6 mr-2 text-primary" />
                            {translate('tournament.topScorers')}
                        </h2>
                        <div className={panelClasses}>
                           <TopScorersList scorers={topScorers} teams={teams} />
                        </div>
                    </section>

                     {/* Schedule */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center text-textPrimary"><CalendarIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.schedule')}</h2>
                        <div className="space-y-6">
                            {schedule?.length > 0 ? [...new Set(schedule.map(m => m.round))].sort((a,b) => a-b).map(roundNum => (
                                <div key={roundNum}>
                                    <h3 className="text-lg font-semibold text-textSecondary mb-2">{translate('schedule.round', { round: roundNum })}</h3>
                                    <div className="space-y-3">
                                        {schedule.filter(m => m.round === roundNum).map(match => (
                                            <div key={match.id} className={`${panelClasses} p-3 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4`}>
                                                <TeamDisplay teamId={match.homeTeamId} alignment="end" teams={teams} />
                                                <div className="flex flex-col items-center justify-center my-2 md:my-0">
                                                    {!!currentUser ? (
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleOpenGoalscorerModal(match, 'home')}
                                                                className="w-20 sm:w-24 text-xl font-bold text-center text-textPrimary bg-background border border-border rounded-lg p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-primary/50 transition-all shadow-sm"
                                                                title={translate('schedule.updateScoreTitle')}
                                                            >
                                                                {match.homeTeamScore ?? '-'}
                                                            </button>
                                                            <span className="font-bold text-lg text-textSecondary">-</span>
                                                             <button
                                                                onClick={() => handleOpenGoalscorerModal(match, 'away')}
                                                                className="w-20 sm:w-24 text-xl font-bold text-center text-textPrimary bg-background border border-border rounded-lg p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-primary/50 transition-all shadow-sm"
                                                                title={translate('schedule.updateScoreTitle')}
                                                            >
                                                                {match.awayTeamScore ?? '-'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xl font-bold px-3 py-1 text-textPrimary bg-background rounded-md">
                                                            {match.status === 'finished' ? `${match.homeTeamScore ?? '-'} - ${match.awayTeamScore ?? '-'}` : 'vs'}
                                                        </span>
                                                    )}
                                                </div>
                                                <TeamDisplay teamId={match.awayTeamId} alignment="start" teams={teams} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )) : <div className={`${panelClasses} p-4`}><p className="text-textSecondary text-center py-4">{translate('schedule.noMatches')}</p></div>}
                        </div>
                    </section>
                </div>
                {/* Teams */}
                <aside className="lg:col-span-1 space-y-6">
                     <h2 className="text-2xl font-semibold flex items-center text-textPrimary"><UsersIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.teams')}</h2>
                     {teams?.map(team => (
                        <div key={team.id} className={panelClasses}>
                            <div className="p-4">
                                <h3 className="font-bold text-lg text-primary mb-2 flex items-center gap-3">
                                    <div style={{ backgroundColor: team.color || '#a1a1aa' }} className="w-1 h-4 rounded-full flex-shrink-0"></div>
                                    {team.name}
                                </h3>
                                <h4 className="font-semibold text-sm text-textPrimary mb-1">{translate('teamList.members')}</h4>
                                <ul className="space-y-1">
                                    {team.members?.map(memberRef => {
                                        const player = players?.find(p => p.id === memberRef.playerId);
                                        if (!player) return null;
                                        return (
                                            <li key={player.id} className="flex items-center text-sm p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700/60 text-textPrimary">
                                                <UserCircleIcon className="w-6 h-6 text-textSecondary mr-2"/>
                                                <span>{player.name}</span>
                                            </li>
                                        );
                                    })}
                                    {(!team.members || team.members.length === 0) && <p className="text-xs text-textSecondary italic">{translate('teamList.noMembers')}</p>}
                                </ul>
                            </div>
                        </div>
                     ))}
                </aside>
            </div>

            {isManageModalOpen && currentUser && (
                <ManageTournamentModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    tournament={tournament}
                />
            )}
             {isGeneratorModalOpen && tournament && (
                <TournamentScheduleGeneratorModal
                    isOpen={isGeneratorModalOpen}
                    onClose={() => setIsGeneratorModalOpen(false)}
                    teams={tournament.teams}
                    onSave={handleSaveGeneratedSchedule}
                />
            )}
             {isJerseyDrawModalOpen && tournament && (
                <TournamentJerseyDrawModal
                    isOpen={isJerseyDrawModalOpen}
                    onClose={() => setIsJerseyDrawModalOpen(false)}
                    teams={tournament.teams}
                    onSave={handleSaveJerseys}
                />
            )}
             {isGoalscorerModalOpen && editingMatchInfo && tournament && (
                <GoalscorerModal
                    isOpen={isGoalscorerModalOpen}
                    onClose={() => setIsGoalscorerModalOpen(false)}
                    match={editingMatchInfo.match}
                    teamType={editingMatchInfo.teamType}
                    allTeams={tournament.teams}
                    allPlayers={tournament.players || []}
                    onSave={handleSaveGoals}
                />
            )}
        </div>
    );
};