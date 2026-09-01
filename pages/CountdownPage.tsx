import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { CalendarIcon, ClockIcon, MapPinIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, onAllPlayersUpdate } from '../services/firebaseService';
import { Tournament, TournamentTeam, TournamentPlayer } from '../types';
import { TOURNAMENT_DOC_ID, getTeamStyle, FALLBACK_TEAMS_FOR_DISPLAY } from '../constants';
import { TeamDetailModal } from '../components/Tournament/TeamDetailModal';
import { PlayerDetailModal } from '../components/Tournament/PlayerDetailModal';
import { StadiumField3D } from '../components/StadiumField3D';

interface TeamEmblemProps {
  name: string;
  imageSrc: string;
  onClick: () => void;
}

const TeamEmblem: React.FC<TeamEmblemProps> = ({ name, imageSrc, onClick }) => (
  <button
    className="group flex flex-col items-center gap-3 w-32 rounded-xl p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    onClick={onClick}
  >
    <span
      className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-border bg-card overflow-hidden
 shadow-orange-sm transition-all duration-350 ease-spring
 group-hover:-translate-y-1 group-hover:shadow-orange-lg group-hover:border-primary/30"
    >
      <img
        src={imageSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ transform: 'scale(1.25)' }}
      />
    </span>
    <span className="text-sm font-semibold text-foreground">{name}</span>
  </button>
);

const useCountdown = (targetDate: string) => {
  const countDownDate = new Date(targetDate).getTime();

  const [countDown, setCountDown] = useState(countDownDate - new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountDown(countDownDate - new Date().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [countDownDate]);

  const isFinished = countDown < 0;
  const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
  const hours = Math.floor((countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isFinished };
};

const CountdownDisplay: React.FC<{ time: number; label: string }> = ({ time, label }) => (
  <div className="flex flex-col items-center min-w-[64px]">
    <span className="font-heading font-bold tabular-nums text-4xl sm:text-5xl text-foreground">
      {String(time).padStart(2, '0')}
    </span>
    <span className="mt-1 text-xs font-medium text-muted-foreground">{label}</span>
  </div>
);

export const CountdownPage: React.FC = () => {
  const { translate } = useLanguage();
  const { isFirebaseReady, addToast } = useAppContext();
  const eventDate = '2025-10-04T15:00:00+09:00'; // Target date: Oct 4th, 3:00 PM GMT+9
  const { days, hours, minutes, seconds, isFinished } = useCountdown(eventDate);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
  const [isPlayerDetailModalOpen, setIsPlayerDetailModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayer | null>(null);

  useEffect(() => {
    if (!isFirebaseReady) return;
    const unsubTournament = onTournamentUpdate(TOURNAMENT_DOC_ID, setTournament);
    const unsubPlayers = onAllPlayersUpdate(setAllPlayers);
    return () => {
      unsubTournament();
      unsubPlayers();
    };
  }, [isFirebaseReady]);

  const handleTeamClick = (teamName: string) => {
    if (!tournament || !tournament.teams || tournament.teams.length === 0) {
      addToast('tournament.loading', 'info');
      return;
    }

    const liveTeam = tournament.teams.find((t) => {
      const styleForClickedName = getTeamStyle(teamName);
      const styleForLiveTeam = getTeamStyle(t.name);
      // Compare by a unique style property like imageSrc to handle name aliases
      return styleForClickedName.imageSrc === styleForLiveTeam.imageSrc;
    });

    if (liveTeam) {
      setSelectedTeam(liveTeam);
      setIsTeamModalOpen(true);
    } else {
      console.warn(`Could not find live data for team: ${teamName}`);
    }
  };

  const handlePlayerSelect = (player: TournamentPlayer) => {
    setSelectedPlayer(player);
    setIsTeamModalOpen(false);
    setIsPlayerDetailModalOpen(true);
  };

  // Danh sách dự phòng để huy hiệu đội luôn hiển thị ngay cả khi chưa có dữ liệu live
  const teamDataForDisplay = FALLBACK_TEAMS_FOR_DISPLAY.map((fallbackTeam) => ({
    ...fallbackTeam,
    imageSrc: getTeamStyle(fallbackTeam.name).imageSrc,
  }));

  return (
    <>
      <div className="relative flex-grow w-full overflow-hidden">
        {/* Nền 3D — vùng chuyển động duy nhất của màn này */}
        <StadiumField3D />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-10">
            <div className="text-center lg:text-left animate-slide-up">
              <h1 className="font-heading font-bold leading-[1.05] text-[clamp(2.25rem,1.4rem+3.4vw,4rem)]">
                <span className="block text-foreground">VNEXT JAPAN</span>
                <span className="block gradient-text">OPEN CUP</span>
              </h1>
              <p className="mt-4 font-heading font-semibold text-[clamp(1.25rem,1rem+1.2vw,1.75rem)] text-foreground">
                Tứ hùng tranh đấu
              </p>
              <p className="mt-2 text-base text-muted-foreground">Khát vọng bứt phá — Kết nối đam mê</p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch justify-center lg:justify-start gap-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-orange-sm">
                  {isFinished ? (
                    <p className="font-heading text-xl font-semibold text-foreground">
                      {translate('countdown.eventStarted')}
                    </p>
                  ) : (
                    <div className="flex items-stretch gap-5 sm:gap-6">
                      <CountdownDisplay time={days} label={translate('countdown.days')} />
                      <CountdownDisplay time={hours} label={translate('countdown.hours')} />
                      <CountdownDisplay time={minutes} label={translate('countdown.minutes')} />
                      <CountdownDisplay time={seconds} label={translate('countdown.seconds')} />
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2 text-sm shadow-orange-sm">
                  <p className="flex items-center gap-2 text-foreground">
                    <CalendarIcon className="w-4 h-4 text-primary" /> 04.10.2025
                  </p>
                  <p className="flex items-center gap-2 text-foreground">
                    <ClockIcon className="w-4 h-4 text-primary" /> 15:00 – 18:00
                  </p>
                  <p className="flex items-center gap-2 text-foreground">
                    <MapPinIcon className="w-4 h-4 text-primary" /> bonera FUTSAL FIELD
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex justify-end animate-slide-up vn-delay-1" aria-hidden="true">
              <img
                src="assets/flaming-ball.png"
                alt=""
                className="w-[380px] h-[380px] xl:w-[440px] xl:h-[440px] object-contain"
              />
            </div>
          </div>

          <div className="mt-14 animate-slide-up vn-delay-2">
            <h2 className="text-center font-heading text-lg font-semibold text-foreground">Bốn đội tranh tài</h2>
            <div className="mt-6 flex flex-wrap justify-center items-start gap-6 sm:gap-10">
              {teamDataForDisplay.map((team) => (
                <TeamEmblem
                  key={team.id}
                  name={team.name}
                  imageSrc={team.imageSrc}
                  onClick={() => handleTeamClick(team.name)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <TeamDetailModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={selectedTeam}
        allPlayers={allPlayers}
        onSelectPlayer={handlePlayerSelect}
      />
      <PlayerDetailModal
        isOpen={isPlayerDetailModalOpen}
        onClose={() => setIsPlayerDetailModalOpen(false)}
        player={selectedPlayer}
      />
    </>
  );
};
