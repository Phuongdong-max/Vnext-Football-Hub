import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { TeamDivisionData, DividedTeam, PlayerSeed, Player, UserRole } from '../types';
import { onTeamDivisionUpdate, updateTeamDivision } from '../services/firebaseService';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { UsersIcon, ArrowPathIcon } from '../components/icons';
import { TeamDivisionSpinner } from '../components/TeamDivisionSpinner';

export const TeamDividerPage: React.FC = () => {
  const { translate, language } = useLanguage();
  const { currentUser, isFirebaseReady, addToast } = useAppContext();

  // Only admins own the roster: they edit it and their division is the one
  // that gets published. Everyone else reads it and may spin locally.
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  type DivisionState = 'idle' | 'spinning' | 'finished';

  const [divisionState, setDivisionState] = useState<DivisionState>('idle');
  const [playersToDivide, setPlayersToDivide] = useState<Player[]>([]);

  const [seedPlayers, setSeedPlayers] = useState({ GK: '', A: '', B: '', C: '', D: '', E: '' });
  const [numberOfTeams, setNumberOfTeams] = useState<number>(3);
  const [dividedTeams, setDividedTeams] = useState<DividedTeam[]>([]);
  const [lastUpdateInfo, setLastUpdateInfo] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPlayers, setIsSavingPlayers] = useState(false);
  const [message, setMessage] = useState('');

  // Set while the admin has typed changes that are not written yet, so an
  // incoming snapshot does not wipe the edit in progress. Held in a ref too
  // because the snapshot callback closes over the value from subscribe time.
  const [hasUnsavedPlayers, setHasUnsavedPlayers] = useState(false);
  const hasUnsavedPlayersRef = useRef(false);
  useEffect(() => {
    hasUnsavedPlayersRef.current = hasUnsavedPlayers;
  }, [hasUnsavedPlayers]);

  const editSeedPlayers = (updater: (prev: typeof seedPlayers) => typeof seedPlayers) => {
    setSeedPlayers(updater);
    setHasUnsavedPlayers(true);
  };

  useEffect(() => {
    if (!isFirebaseReady) return;

    const unsubscribe = onTeamDivisionUpdate((data) => {
      if (data) {
        if (!hasUnsavedPlayersRef.current) {
          setSeedPlayers({
            GK: data.seedPlayers.GK || '',
            A: data.seedPlayers.A || '',
            B: data.seedPlayers.B || '',
            C: data.seedPlayers.C || '',
            D: data.seedPlayers.D || '',
            E: data.seedPlayers.E || '',
          });
        }
        if (data.dividedTeams && data.dividedTeams.length > 0) {
          setDividedTeams(data.dividedTeams);
          setNumberOfTeams(data.dividedTeams.length);
          setDivisionState('finished');
        }

        if (data.lastUpdated && data.updatedBy) {
          const date = new Date(data.lastUpdated);
          setLastUpdateInfo(
            translate('teamDivider.lastUpdated', {
              name: data.updatedBy.name,
              date: date.toLocaleString(language),
            }),
          );
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
        .split('\n')
        .map((name) => name.trim())
        .filter((name) => name !== '')
        .map((name) => ({ name, seed }));
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
      ...processTextarea(seedPlayers.A, 'A'),
      ...processTextarea(seedPlayers.B, 'B'),
      ...processTextarea(seedPlayers.C, 'C'),
      ...processTextarea(seedPlayers.D, 'D'),
      ...processTextarea(seedPlayers.E, 'E'),
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

  const handleSavePlayers = async () => {
    if (!isAdmin) return;
    setMessage('');
    setIsSavingPlayers(true);
    try {
      await updateTeamDivision({ seedPlayers }, currentUser);
      setHasUnsavedPlayers(false);
      addToast('teamDivider.message.playersSaved', 'success');
    } catch (error) {
      console.error(error);
      addToast('teamDivider.message.playersSaveError', 'error');
    } finally {
      setIsSavingPlayers(false);
    }
  };

  const handleDivisionComplete = async (finalTeams: DividedTeam[]) => {
    setDividedTeams(finalTeams);
    setDivisionState('finished');

    // Non-admins can spin to preview a split, but only an admin's result is
    // published to everyone.
    if (!isAdmin) {
      addToast('teamDivider.message.resultNotSaved', 'info');
      return;
    }

    setIsSaving(true);
    try {
      await updateTeamDivision({ seedPlayers, dividedTeams: finalTeams }, currentUser);
      setHasUnsavedPlayers(false);
      addToast('teamDivider.message.saveSuccess', 'success');
    } catch (error) {
      console.error(error);
      addToast('teamDivider.message.saveError', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const textareaBaseClasses =
    'w-full p-3 rounded-md shadow-orange-sm focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground custom-scrollbar-thin';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-muted-foreground">{translate('teamDivider.loading')}</p>
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
        <h1 className="text-3xl font-bold text-foreground">{translate('teamDivider.title')}</h1>
        <p className="text-muted-foreground mt-1">{translate('teamDivider.subtitle')}</p>
      </header>

      <main className="space-y-8">
        {/* Admins keep the old flow where the editor collapses once a division
 is published and comes back via "New Division". For everyone else
 the roster is read-only, so it stays visible next to the result. */}
        {(divisionState !== 'finished' || !isAdmin) && (
          <section className="p-4 sm:p-6 bg-card rounded-lg shadow-orange-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                {isAdmin ? translate('teamDivider.inputTitle') : translate('teamDivider.rosterTitle')}
              </h2>
              {isAdmin ? (
                <div className="flex items-center gap-3">
                  {hasUnsavedPlayers && (
                    <span className="text-xs font-medium text-warning">
                      {translate('teamDivider.unsavedIndicator')}
                    </span>
                  )}
                  <Button
                    onClick={handleSavePlayers}
                    disabled={isSavingPlayers || !hasUnsavedPlayers}
                    variant="secondary"
                    size="sm"
                  >
                    {isSavingPlayers ? <LoadingSpinner size="sm" /> : translate('teamDivider.savePlayersButton')}
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">{translate('teamDivider.rosterAdminOnly')}</span>
              )}
            </div>
            {isAdmin ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="seedGK" className="block text-sm font-medium text-foreground mb-1">
                    {translate('teamDivider.seedGK')}
                  </label>
                  <textarea
                    id="seedGK"
                    rows={3}
                    value={seedPlayers.GK}
                    onChange={(e) => editSeedPlayers((prev) => ({ ...prev, GK: e.target.value }))}
                    className={textareaBaseClasses}
                    placeholder={translate('teamDivider.playerPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {(['A', 'B', 'C', 'D', 'E'] as PlayerSeed[]).map((seed) => {
                    if (seed === 'GK') return null;
                    return (
                      <div key={seed}>
                        <label htmlFor={`seed${seed}`} className="block text-sm font-medium text-foreground mb-1">
                          {translate(`teamDivider.seed${seed}`)}
                        </label>
                        <textarea
                          id={`seed${seed}`}
                          rows={5}
                          value={seedPlayers[seed as Exclude<PlayerSeed, 'GK'>]}
                          onChange={(e) => editSeedPlayers((prev) => ({ ...prev, [seed]: e.target.value }))}
                          className={textareaBaseClasses}
                          placeholder={translate('teamDivider.playerPlaceholder')}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {(['GK', 'A', 'B', 'C', 'D', 'E'] as PlayerSeed[]).map((seed) => {
                  const names = seedPlayers[seed]
                    .split('\n')
                    .map((n) => n.trim())
                    .filter(Boolean);
                  return (
                    <div key={seed} className="bg-background border border-border rounded-md p-3">
                      <h3 className="text-sm font-medium text-foreground mb-2 pb-2 border-b border-border">
                        {translate(`teamDivider.seed${seed}`)}
                        <span className="ml-1 text-xs text-muted-foreground font-normal">({names.length})</span>
                      </h3>
                      {names.length > 0 ? (
                        <ul className="space-y-1">
                          {names.map((name, i) => (
                            <li key={`${seed}-${i}`} className="text-sm text-foreground">
                              {name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">{translate('teamDivider.noPlayersYet')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-8 text-center">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
                <div>
                  <label htmlFor="numberOfTeams" className="block text-sm font-medium text-foreground mb-1">
                    {translate('teamDivider.numberOfTeamsLabel')}
                  </label>
                  <input
                    id="numberOfTeams"
                    type="number"
                    min="2"
                    max="10"
                    value={numberOfTeams || ''}
                    onChange={(e) => setNumberOfTeams(Number(e.target.value))}
                    onBlur={() => {
                      if (numberOfTeams < 2) setNumberOfTeams(2);
                    }}
                    className="w-28 h-10 text-center rounded-md border border-input bg-card text-foreground text-sm transition-shadow duration-150 ease-spring focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
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
            {message && <div className="mt-4 text-center text-danger-text">{message}</div>}
          </section>
        )}

        <section>
          <div className="text-center mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <h2 className="text-2xl font-semibold text-foreground">{translate('teamDivider.resultsTitle')}</h2>
              {divisionState === 'finished' && (
                <Button onClick={() => setDivisionState('idle')} variant="outline" size="sm">
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  {translate('teamDivider.newDivisionButton')}
                </Button>
              )}
            </div>
            {lastUpdateInfo && <p className="text-xs text-muted-foreground mt-1">{lastUpdateInfo}</p>}
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {dividedTeams.length > 0
              ? dividedTeams.map((team) => (
                  <div
                    key={team.id}
                    id={`team-box-${team.id}`}
                    className="bg-card rounded-xl shadow-card hover:shadow-card-hover transition-shadow duration-300 flex flex-col p-5"
                  >
                    <h3 className="text-xl font-semibold text-primary mb-3">
                      {translate('teamDivider.teamLabel', { id: team.id })}
                    </h3>
                    <ul className="space-y-1 text-foreground flex-grow mb-3 pr-2 overflow-y-auto max-h-48 custom-scrollbar-thin">
                      {team.players.length > 0 ? (
                        team.players.map((player) => (
                          <li
                            key={`${player.name}-${team.id}`}
                            className="py-1 px-2 rounded hover:bg-primary/10 transition-colors duration-150 flex justify-between"
                          >
                            <span className="font-medium">
                              {player.name}
                              {player.seed === 'GK' ? ' (GK)' : ''}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">({player.seed})</span>
                          </li>
                        ))
                      ) : (
                        <p className="text-muted-foreground italic text-sm">{translate('teamDivider.noPlayersYet')}</p>
                      )}
                    </ul>
                    <div className="mt-auto pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
                      <p>
                        {translate('teamDivider.totalSeedValue')}:{' '}
                        <span className="font-semibold text-primary">{team.totalSeedValue}</span>
                      </p>
                      <p>
                        {translate('teamDivider.playerCount')}:{' '}
                        <span className="font-semibold text-primary">{team.playerCount}</span>
                      </p>
                    </div>
                  </div>
                ))
              : divisionState === 'finished' && (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    {translate('teamDivider.noPlayers')}
                  </p>
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
