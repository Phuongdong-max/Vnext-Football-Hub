import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage, useAppContext } from '../App';
import { TeamDivisionData, DividedTeam, PlayerSeed } from '../types';
import { onTeamDivisionUpdate, updateTeamDivision } from '../services/firebaseService';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { UsersIcon } from '../components/icons';

export const TeamDividerPage: React.FC = () => {
    const { translate, language } = useLanguage();
    const { currentUser, isFirebaseReady, addToast } = useAppContext();
    
    const [seedPlayers, setSeedPlayers] = useState({ A: '', B: '', C: '', D: '' });
    const [dividedTeams, setDividedTeams] = useState<DividedTeam[]>([]);
    const [lastUpdateInfo, setLastUpdateInfo] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (!isFirebaseReady) return;

        const unsubscribe = onTeamDivisionUpdate((data) => {
            if (data) {
                setSeedPlayers(data.seedPlayers);
                if (data.dividedTeams && data.dividedTeams.length > 0) {
                    setDividedTeams(data.dividedTeams);
                } else if (isInitialLoad.current) {
                     setDividedTeams([]);
                }
                
                if (data.lastUpdated && data.updatedBy) {
                    const date = new Date(data.lastUpdated);
                    setLastUpdateInfo(translate('teamDivider.lastUpdated', {
                        name: data.updatedBy.name,
                        date: date.toLocaleString(language),
                    }));
                } else {
                    setLastUpdateInfo(translate('teamDivider.lastUpdated.never'));
                }
            } else {
                setLastUpdateInfo(translate('teamDivider.lastUpdated.never'));
            }
            setIsLoading(false);
            isInitialLoad.current = false;
        });

        return () => unsubscribe();
    }, [isFirebaseReady, translate, language]);

    const handleDivideTeams = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setMessage('');
        const seedValues: Record<PlayerSeed, number> = { A: 4, B: 3, C: 2, D: 1 };
        
        const processTextarea = (text: string, seed: PlayerSeed) => {
            return text
                .split("\n")
                .map(name => name.trim())
                .filter(name => name !== "")
                .map(name => ({ name, seed }));
        };

        const shuffleArray = (array: any[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        let allPlayers = [
            ...processTextarea(seedPlayers.A, 'A'),
            ...processTextarea(seedPlayers.B, 'B'),
            ...processTextarea(seedPlayers.C, 'C'),
            ...processTextarea(seedPlayers.D, 'D'),
        ];

        if (allPlayers.length === 0) {
            setMessage(translate('teamDivider.message.atLeastOnePlayer'));
            return;
        }

        const playersA = shuffleArray(processTextarea(seedPlayers.A, "A"));
        const playersB = shuffleArray(processTextarea(seedPlayers.B, "B"));
        const playersC = shuffleArray(processTextarea(seedPlayers.C, "C"));
        const playersD = shuffleArray(processTextarea(seedPlayers.D, "D"));
        allPlayers = [...playersA, ...playersB, ...playersC, ...playersD];
        
        const teams: DividedTeam[] = Array(4).fill(null).map((_, index) => ({
            id: index + 1,
            players: [],
            totalSeedValue: 0,
            playerCount: 0,
        }));
        
        for (const player of allPlayers) {
            teams.sort((a, b) => {
                if (a.totalSeedValue !== b.totalSeedValue) return a.totalSeedValue - b.totalSeedValue;
                if (a.playerCount !== b.playerCount) return a.playerCount - b.playerCount;
                return a.id - b.id;
            });
            const targetTeam = teams[0];
            targetTeam.players.push(player);
            targetTeam.totalSeedValue += seedValues[player.seed];
            targetTeam.playerCount++;
        }
        
        teams.sort((a, b) => a.id - b.id);
        
        setIsSaving(true);
        try {
            await updateTeamDivision({ seedPlayers, dividedTeams: teams }, currentUser);
        } catch (error) {
            console.error(error);
            addToast(translate('teamDivider.message.saveError'), 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const textareaBaseClasses = "w-full p-3 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-background dark:bg-slate-800 border border-border dark:border-slate-700 text-textPrimary placeholder-gray-400 dark:placeholder-slate-400 custom-scrollbar-thin";

    if (isLoading) {
       return (
        <div className="flex justify-center items-center py-10">
             <LoadingSpinner size="lg"/>
             <p className="ml-4 text-textSecondary">{translate('teamDivider.loading')}</p>
        </div>
       );
    }
    
    return (
        <div className="space-y-8">
            <header className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-textPrimary">{translate('teamDivider.title')}</h1>
                <p className="text-textSecondary mt-1">{translate('teamDivider.subtitle')}</p>
            </header>

            <main className="space-y-8">
                <section className="p-4 sm:p-6 bg-surface rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-6 text-textPrimary">{translate('teamDivider.inputTitle')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(['A', 'B', 'C', 'D'] as PlayerSeed[]).map(seed => (
                            <div key={seed}>
                                <label htmlFor={`seed${seed}`} className="block text-sm font-medium text-textPrimary mb-1">
                                    {translate(`teamDivider.seed${seed}`)}
                                </label>
                                <textarea
                                    id={`seed${seed}`}
                                    rows={5}
                                    value={seedPlayers[seed]}
                                    onChange={(e) => setSeedPlayers(prev => ({ ...prev, [seed]: e.target.value }))}
                                    className={textareaBaseClasses}
                                    placeholder={translate('teamDivider.playerPlaceholder')}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <Button
                            onClick={handleDivideTeams}
                            disabled={isSaving}
                            size="lg"
                        >
                            <UsersIcon className="w-5 h-5 mr-2" />
                            {isSaving ? translate('teamDivider.message.saving') : translate('teamDivider.divideButton')}
                        </Button>
                    </div>
                    {message && <div className="mt-4 text-center text-danger">{message}</div>}
                </section>

                <section>
                    <div className="text-center mb-6">
                         <h2 className="text-2xl font-semibold text-textPrimary">{translate('teamDivider.resultsTitle')}</h2>
                         {lastUpdateInfo && <p className="text-xs text-textSecondary mt-1">{lastUpdateInfo}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {dividedTeams.length > 0 ? dividedTeams.map(team => (
                            <div key={team.id} className="bg-surface rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col p-5">
                                <h3 className="text-xl font-semibold text-primary mb-3">{translate('teamDivider.teamLabel', { id: team.id })}</h3>
                                <ul className="space-y-1 text-textPrimary flex-grow mb-3 pr-2 overflow-y-auto max-h-48 custom-scrollbar-thin">
                                    {team.players.length > 0 ? team.players.map(player => (
                                        <li key={player.name} className="py-1 px-2 rounded hover:bg-primary/10 transition-colors duration-150 flex justify-between">
                                            <span className="font-medium">{player.name}</span>
                                            <span className="text-xs text-textSecondary font-mono">({player.seed})</span>
                                        </li>
                                    )) : <p className="text-textSecondary italic text-sm">{translate('teamDivider.noPlayersYet')}</p>}
                                </ul>
                                <div className="mt-auto pt-3 border-t border-border text-xs text-textSecondary space-y-1">
                                    <p>{translate('teamDivider.totalSeedValue')}: <span className="font-semibold text-primary">{team.totalSeedValue}</span></p>
                                    <p>{translate('teamDivider.playerCount')}: <span className="font-semibold text-primary">{team.playerCount}</span></p>
                                </div>
                            </div>
                        )) : (
                            <p className="col-span-full text-center text-textSecondary py-8">{translate('teamDivider.noPlayers')}</p>
                        )}
                    </div>
                </section>
            </main>
             <style>{`
              .custom-scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
              .custom-scrollbar-thin::-webkit-scrollbar-track { background-color: transparent; border-radius: 10px; }
              html.dark .custom-scrollbar-thin::-webkit-scrollbar-track { background-color: transparent; }
              .custom-scrollbar-thin::-webkit-scrollbar-thumb { @apply bg-secondary/50; border-radius: 10px; }
              .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { @apply bg-secondary/70; }
            `}</style>
        </div>
    );
};