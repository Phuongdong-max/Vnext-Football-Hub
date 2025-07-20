


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { TeamDivisionData, DividedTeam, PlayerSeed, Player } from '../types';
import { onTeamDivisionUpdate, updateTeamDivision } from '../services/firebaseService';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { UsersIcon, ArrowPathIcon } from '../components/icons';
import { TeamDivisionSpinner } from '../components/TeamDivisionSpinner';

export const TeamDividerPage: React.FC = () => {
    const { translate, language } = useLanguage();
    const { currentUser, isFirebaseReady, addToast } = useAppContext();
    
    type DivisionState = 'idle' | 'spinning' | 'finished';

    const [divisionState, setDivisionState] = useState<DivisionState>('idle');
    const [playersToDivide, setPlayersToDivide] = useState<Player[]>([]);

    const [seedPlayers, setSeedPlayers] = useState({ GK: '', A: '', B: '', C: '', D: '', E: '' });
    const [numberOfTeams, setNumberOfTeams] = useState<number>(3);
    const [dividedTeams, setDividedTeams] = useState<DividedTeam[]>([]);
    const [lastUpdateInfo, setLastUpdateInfo] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isFirebaseReady) return;

        const unsubscribe = onTeamDivisionUpdate((data) => {
            if (data) {
                setSeedPlayers({
                    GK: data.seedPlayers.GK || '',
                    A: data.seedPlayers.A || '',
                    B: data.seedPlayers.B || '',
                    C: data.seedPlayers.C || '',
                    D: data.seedPlayers.D || '',
                    E: data.seedPlayers.E || '',
                });
                if (data.dividedTeams && data.dividedTeams.length > 0) {
                    setDividedTeams(data.dividedTeams);
                    setNumberOfTeams(data.dividedTeams.length);
                    setDivisionState('finished');
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
        });

        return () => unsubscribe();
    }, [isFirebaseReady, translate, language]);

    const handlePrepareAndStartDivision = () => {
        setMessage('');

        if (numberOfTeams < 2) {
            setMessage(translate('teamDivider.message.minPlayersToSplit', { count: 2 }));
            return;
        }
        
        const processTextarea = (text: string, seed: PlayerSeed): Player[] => {
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
        
        const allPlayers = shuffleArray([
            ...processTextarea(seedPlayers.GK, 'GK'),
            ...processTextarea(seedPlayers.A, "A"),
            ...processTextarea(seedPlayers.B, "B"),
            ...processTextarea(seedPlayers.C, "C"),
            ...processTextarea(seedPlayers.D, "D"),
            ...processTextarea(seedPlayers.E, "E")
        ]);

        if (allPlayers.length === 0) {
            setMessage(translate('teamDivider.message.atLeastOnePlayer'));
            return;
        }

        if (allPlayers.length < numberOfTeams) {
            setMessage(translate('teamDivider.message.minPlayersToSplit', { count: numberOfTeams }));
            return;
        }

        setPlayersToDivide(allPlayers);
        setDividedTeams([]);
        setDivisionState('spinning');
    };

    const handleDivisionComplete = async (finalTeams: DividedTeam[]) => {
        setDividedTeams(finalTeams);
        setDivisionState('finished');

        setIsSaving(true);
        try {
            await updateTeamDivision({ seedPlayers, dividedTeams: finalTeams }, currentUser);
            addToast('teamDivider.message.saveSuccess', 'success');
        } catch (error) {
            console.error(error);
            addToast('teamDivider.message.saveError', 'error');
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
    
    if (divisionState === 'spinning') {
        return (
            <TeamDivisionSpinner
                players={playersToDivide}
                numberOfTeams={numberOfTeams}
                onComplete={handleDivisionComplete}
            />
        );
    }

    return (
        <div className="space-y-8">
            <header className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-textPrimary">{translate('teamDivider.title')}</h1>
                <p className="text-textSecondary mt-1">{translate('teamDivider.subtitle')}</p>
            </header>

            <main className="space-y-8">
                {divisionState !== 'finished' && (
                    <section className="p-4 sm:p-6 bg-surface rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-6 text-textPrimary">{translate('teamDivider.inputTitle')}</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="seedGK" className="block text-sm font-medium text-textPrimary mb-1">
                                    {translate('teamDivider.seedGK')}
                                </label>
                                <textarea
                                    id="seedGK"
                                    rows={3}
                                    value={seedPlayers.GK}
                                    onChange={(e) => setSeedPlayers(prev => ({ ...prev, GK: e.target.value }))}
                                    className={textareaBaseClasses}
                                    placeholder={translate('teamDivider.playerPlaceholder')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                {(['A', 'B', 'C', 'D', 'E'] as PlayerSeed[]).map(seed => {
                                    if (seed === 'GK') return null;
                                    return (
                                        <div key={seed}>
                                            <label htmlFor={`seed${seed}`} className="block text-sm font-medium text-textPrimary mb-1">
                                                {translate(`teamDivider.seed${seed}`)}
                                            </label>
                                            <textarea
                                                id={`seed${seed}`}
                                                rows={5}
                                                value={seedPlayers[seed as Exclude<PlayerSeed, 'GK'>]}
                                                onChange={(e) => setSeedPlayers(prev => ({ ...prev, [seed]: e.target.value }))}
                                                className={textareaBaseClasses}
                                                placeholder={translate('teamDivider.playerPlaceholder')}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
                                <div>
                                    <label htmlFor="numberOfTeams" className="block text-sm font-medium text-textPrimary mb-1">
                                        {translate('teamDivider.numberOfTeamsLabel')}
                                    </label>
                                    <input
                                        id="numberOfTeams"
                                        type="number"
                                        min="2"
                                        max="10"
                                        value={numberOfTeams || ''}
                                        onChange={e => setNumberOfTeams(Number(e.target.value))}
                                        onBlur={() => { if (numberOfTeams < 2) setNumberOfTeams(2); }}
                                        className="w-28 text-center p-2 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-background dark:bg-slate-800 border border-border dark:border-slate-700 text-textPrimary"
                                    />
                                </div>
                                <Button
                                    onClick={handlePrepareAndStartDivision}
                                    disabled={isSaving || numberOfTeams < 2}
                                    size="lg"
                                    className="w-full sm:w-auto sm:self-end h-[42px]"
                                >
                                    <UsersIcon className="w-5 h-5 mr-2" />
                                    {isSaving ? translate('teamDivider.message.saving') : translate('teamDivider.divideButton')}
                                </Button>
                            </div>
                        </div>
                        {message && <div className="mt-4 text-center text-danger">{message}</div>}
                    </section>
                )}

                <section>
                    <div className="text-center mb-6">
                         <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                           <h2 className="text-2xl font-semibold text-textPrimary">{translate('teamDivider.resultsTitle')}</h2>
                           {divisionState === 'finished' && (
                              <Button onClick={() => setDivisionState('idle')} variant="outline" size="sm">
                                <ArrowPathIcon className="w-4 h-4 mr-2"/>
                                {translate('teamDivider.newDivisionButton')}
                              </Button>
                           )}
                         </div>
                         {lastUpdateInfo && <p className="text-xs text-textSecondary mt-1">{lastUpdateInfo}</p>}
                    </div>
                    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {dividedTeams.length > 0 ? dividedTeams.map(team => (
                            <div key={team.id} id={`team-box-${team.id}`} className="bg-surface rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col p-5">
                                <h3 className="text-xl font-semibold text-primary mb-3">{translate('teamDivider.teamLabel', { id: team.id })}</h3>
                                <ul className="space-y-1 text-textPrimary flex-grow mb-3 pr-2 overflow-y-auto max-h-48 custom-scrollbar-thin">
                                    {team.players.length > 0 ? team.players.map(player => (
                                        <li key={`${player.name}-${team.id}`} className="py-1 px-2 rounded hover:bg-primary/10 transition-colors duration-150 flex justify-between">
                                            <span className="font-medium">{player.name}{player.seed === 'GK' ? ' (GK)' : ''}</span>
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
                           divisionState === 'finished' && <p className="col-span-full text-center text-textSecondary py-8">{translate('teamDivider.noPlayers')}</p>
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