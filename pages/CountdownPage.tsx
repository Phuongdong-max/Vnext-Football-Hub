import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { StarIcon } from '../components/icons';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, onAllPlayersUpdate } from '../services/firebaseService';
import { Tournament, TournamentTeam, TournamentPlayer } from '../types';
import { getTeamStyle, FALLBACK_TEAMS_FOR_DISPLAY } from '../constants';
import { TeamDetailModal } from '../components/Tournament/TeamDetailModal';
import { PlayerDetailModal } from '../components/Tournament/PlayerDetailModal';


// --- SVG & Asset Components (Embedded for portability) ---

const CrestIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144" {...props}>
        <path d="M41.7 131.5c-2-1-3.9-2.3-5.6-3.9-10.9-10.3-15.4-25-11.5-39.1 1.6-5.6 4.7-10.6 8.9-14.5 3.3-3.1 7.2-5.4 11.4-6.8 5.4-1.8 11.1-1.8 16.5 0 2 .6 3.9 1.5 5.7 2.6-1.5-18.4-16.8-33.1-35.4-33.1S31 38.6 29.5 57c.7-1.3 1.4-2.5 2.2-3.7C40 39.9 53.6 32 69.1 32c14.6 0 27.9 6.8 35.4 17.5 1.5 2.1 2.8 4.4 3.9 6.8 3.5 8 3.5 17.2 0 25.2-1.9 4.3-4.7 8.1-8.2 11.1-5.1 4.3-11.2 7-17.8 7.8-4.3.5-8.6.3-12.8-.5-3.3-.6-6.6-1.5-9.7-2.7z" opacity=".1" />
        <path d="M110.8 118.3c-2 .6-4 .9-6 .9-5.1 0-10-1.7-14.2-4.6-10.8-7.5-16.1-20.1-13.4-32.9.9-4.2 2.9-8.1 5.8-11.3 3.6-3.9 8.3-6.5 13.5-7.3 4.9-.7 9.8.3 14.1 2.8 4.2 2.5 7.4 6.3 9.3 10.8 2.1 5 2.3 10.4.6 15.6-1.8 5.3-5 10-9.3 13.4-3.1 2.5-6.6 4.2-10.4 5.1z" opacity=".1" />
        <path d="M83.4 33.7c-5.9-3.4-12.8-5-19.8-4.2-13 .9-24.8 7.9-30.9 18.7-2.6 4.6-4.2 9.8-4.7 15.2-1.1 13 4.1 25.9 14.2 33.9 2.1 1.6 4.3 3 6.7 4.1 9.4 4.3 20 5.2 29.9 2.5 10.6-2.9 19.3-10 24.3-19.9 2.2-4.3 3.6-9 4.1-13.8.7-7.2-.6-14.4-3.9-20.8-2.5-4.7-6-8.8-10.1-11.9-2.9-2.2-6.1-4-9.5-5.3zm-1.8 6c2.7 1 5.2 2.5 7.4 4.3 6.5 5.4 10.2 13.3 9.7 21.6-.4 6-2.5 11.7-5.9 16.5-5.8 8.4-15.4 13.6-25.7 13.6-6.1 0-12.1-1.7-17.1-5-12.8-8.3-18.4-23.4-13.6-37.4 1-2.9 2.6-5.6 4.6-8 5.2-6.2 13-10.2 21.4-10.2 5.1 0 10 1.3 14.2 4.3z" fill="#4B4B4B" />
        <path d="M12 25.4c-1.6 0-3.1.2-4.6.5.5-2.2 1.1-4.4 1.8-6.5.7-2.3 1.6-4.5 2.6-6.6.2-.4.4-.8.6-1.2h.4c.2.4.4.8.6 1.2 1 2.1 1.9 4.3 2.6 6.6.7 2.1 1.3 4.3 1.8 6.5-1.5-.3-3-.5-4.6-.5z" fill="#4B4B4B" />
        <path d="M29.6 17.6c-1.3 1.6-2.6 3.2-3.8 4.9-.6.9-1.2 1.8-1.8 2.7v.4c.6.9 1.2 1.7 1.9 2.6 1.1 1.5 2.3 2.9 3.5 4.3 1.4-1.1 2.8-2.3 4.1-3.5.7-.7 1.3-1.4 1.9-2.1h.4c-.6-.8-1.2-1.6-1.8-2.4-1.3-1.8-2.7-3.5-4.1-5.2-1.3.1-2.6.2-4 .3zM128.5 25.2c-1.2-1.7-2.5-3.3-3.8-4.9-1.4-1.7-2.8-3.4-4.2-5-1.3 0-2.6-.1-3.9-.2.7.9 1.4 1.8 2.1 2.7.6.8 1.2 1.6 1.8 2.4h.4c-.6.7-1.2 1.4-1.8 2.1-1.2 1.2-2.5 2.4-3.7 3.5 1.2 1.5 2.4 3 3.6 4.4.6.7 1.2 1.5 1.8 2.2v.4c-.6.9-1.2 1.8-1.9 2.7-1.1 1.6-2.3 3.1-3.5 4.7 1.5.1 3 .1 4.5.1 1.2-1.6 2.4-3.2 3.5-4.9.6-.8 1.2-1.7 1.7-2.5v-.4c-.5-.8-1.1-1.6-1.6-2.4-1.2-1.7-2.4-3.4-3.6-5.1 1.3 0 2.5.1 3.7.1z" fill="#4B4B4B" />
    </svg>
);

const FlamingSoccerBall: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <img src="assets/flaming-ball.png" alt="Flaming Soccer Ball" {...props} />
);

const DotPatternAccent: React.FC<{ position: 'top-left' | 'bottom-right' | 'top-right' | 'bottom-left' }> = ({ position }) => {
    let positionClasses = '';
    let maskPosition = '';
    let maskGradient = '';

    switch (position) {
        case 'top-left':
            positionClasses = 'top-0 left-0';
            maskPosition = 'top left';
            maskGradient = 'linear-gradient(to bottom right, white 20%, transparent 80%)';
            break;
        case 'bottom-right':
            positionClasses = 'bottom-0 right-0';
            maskPosition = 'bottom right';
            maskGradient = 'linear-gradient(to top left, white 20%, transparent 80%)';
            break;
        case 'top-right':
            positionClasses = 'top-0 right-0';
            maskPosition = 'top right';
            maskGradient = 'linear-gradient(to bottom left, white 20%, transparent 80%)';
            break;
        case 'bottom-left':
            positionClasses = 'bottom-0 left-0';
            maskPosition = 'bottom left';
            maskGradient = 'linear-gradient(to top right, white 20%, transparent 80%)';
            break;
        default:
            positionClasses = '';
            maskPosition = '';
            maskGradient = '';
    }

    return (
        <div
            className={`absolute ${positionClasses} w-48 h-48 sm:w-64 sm:h-64 opacity-80`}
            style={{
                backgroundImage: 'radial-gradient(circle, #8c2a3e 1.5px, transparent 1.5px)',
                backgroundSize: '12px 12px',
                maskImage: maskGradient,
                WebkitMaskImage: maskGradient,
                maskPosition: maskPosition,
                WebkitMaskPosition: maskPosition,
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
            }}
            aria-hidden="true"
        />
    );
};

interface TeamEmblemProps {
    name: string;
    imageSrc: string;
    borderColor: string;
    onClick: () => void;
}
const TeamEmblem: React.FC<TeamEmblemProps> = ({ name, imageSrc, borderColor, onClick }) => (
    <button className="flex flex-col items-center gap-2 text-center w-36 group" onClick={onClick}>
        <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[8px] transition-all duration-300 ease-in-out group-hover:border-opacity-50 group-hover:scale-105`} style={{ borderColor }}>
            <img src={imageSrc} alt={name} className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-110 " style={{ transform: 'scale(1.25)' }} />
        </div>
        <span className="font-semibold text-sm sm:text-base text-black h-10 flex items-center justify-center">{name}</span>
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
    <div className="flex flex-col items-center">
        <span className="text-4xl sm:text-5xl font-black text-black tracking-tighter">{String(time).padStart(2, '0')}</span>
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{label}</span>
    </div>
);


export const CountdownPage: React.FC = () => {
    const { translate } = useLanguage();
    const { isFirebaseReady, addToast, selectedTournamentId } = useAppContext();
    const eventDate = "2025-10-04T15:00:00+09:00"; // Target date: Oct 4th, 3:00 PM GMT+9
    const { days, hours, minutes, seconds, isFinished } = useCountdown(eventDate);
    
    // --- Dynamic Data Logic ---
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
    const [isPlayerDetailModalOpen, setIsPlayerDetailModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayer | null>(null);

    useEffect(() => {
        if (!isFirebaseReady) return;
        if (!selectedTournamentId) return;
        // TOURNAMENT_DOC_ID pointed at a document id that does not exist, so this
        // page always fell back to the hardcoded demo teams. It now follows the
        // season selected app-wide.
        const unsubTournament = onTournamentUpdate(selectedTournamentId, setTournament);
        const unsubPlayers = onAllPlayersUpdate(selectedTournamentId, setAllPlayers);
        return () => {
            unsubTournament();
            unsubPlayers();
        };
    }, [isFirebaseReady, selectedTournamentId]);

    const handleTeamClick = (teamName: string) => {
        if (!tournament || !tournament.teams || tournament.teams.length === 0) {
            addToast('tournament.loading', 'info');
            return;
        }

        const liveTeam = tournament.teams.find(t => {
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
        setIsTeamModalOpen(false); // Close team modal
        setIsPlayerDetailModalOpen(true); // Open player detail modal
    };
    
    // Use the fallback list for immediate display to ensure emblems are always visible.
    const teamDataForDisplay = FALLBACK_TEAMS_FOR_DISPLAY.map(fallbackTeam => {
        const style = getTeamStyle(fallbackTeam.name);
        return {
            ...fallbackTeam,
            imageSrc: style.imageSrc,
            borderColor: style.borderColor,
        };
    });

    return (
      <>
        <div className="flex-grow w-full bg-[#f4efe8] flex items-center justify-center relative overflow-hidden p-4">
            <DotPatternAccent position="top-left" />
            <DotPatternAccent position="top-right" />
            <DotPatternAccent position="bottom-left" />
            <DotPatternAccent position="bottom-right" />
            
            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-full">
                {/* Main Content Area */}
                <div className="w-full flex-grow relative flex flex-col justify-center items-center lg:items-start text-center lg:text-left">
                    {/* Layer for Text Content */}
                    <div className="relative z-10 w-full lg:w-3/5 xl:w-7/12 py-8">
                        <CrestIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-5 dark:opacity-[0.02] pointer-events-none" />
                        
                        <h1 className="font-black tracking-tighter text-6xl sm:text-7xl md:text-8xl lg:text-9xl relative">
                            <span className="text-[#cb3737]">VNEXT JAPAN</span>
                            <span className="block text-black">OPEN CUP</span>
                        </h1>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl text-[#cb3737] font-bold tracking-tight mt-2">TỨ HÙNG TRANH ĐẤU</h2>
                        <p className="text-lg sm:text-xl text-black font-semibold mt-1">Khát vọng bứt phá - Kết nối đam mê</p>

                        <div className="flex justify-center lg:justify-start items-center gap-4 mt-8">
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 flex items-stretch gap-4 sm:gap-6 shadow-lg border border-white">
                                {isFinished ? (
                                    <div className="text-2xl font-bold text-black">{translate('countdown.eventStarted')}</div>
                                ) : (
                                    <>
                                        <CountdownDisplay time={days} label={translate('countdown.days')} />
                                        <CountdownDisplay time={hours} label={translate('countdown.hours')} />
                                        <CountdownDisplay time={minutes} label={translate('countdown.minutes')} />
                                        <CountdownDisplay time={seconds} label={translate('countdown.seconds')} />
                                    </>
                                )}
                            </div>
                            <div className="hidden sm:block bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-black font-bold text-lg leading-tight shadow-lg border border-white">
                                <span>15:00 - 18:00</span><br />
                                <span>Oct - 4th</span><br />
                                <span>bonera FUTSAL FIELD</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Layer for Soccer Ball Image */}
                    <div className="absolute z-0 top-1/2 right-0 lg:-translate-y-1/2 w-full lg:w-1/2 h-auto pointer-events-none flex justify-center lg:justify-end opacity-80 lg:opacity-100 mt-8 lg:mt-0">
                         <FlamingSoccerBall className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] object-contain" />
                    </div>
                </div>

                {/* Team Emblems */}
                <div className="w-full flex flex-wrap justify-center items-start gap-x-8 sm:gap-x-12 gap-y-6 mt-12 mb-8">
                   {teamDataForDisplay.map(team => (
                        <TeamEmblem
                            key={team.id}
                            name={team.name}
                            imageSrc={team.imageSrc}
                            borderColor={team.borderColor}
                            onClick={() => handleTeamClick(team.name)}
                        />
                    ))}
                </div>
                
                {/* Decorative Stars */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
                    <StarIcon className="w-5 h-5 text-[#4B4B4B]" />
                    <StarIcon className="w-5 h-5 text-[#4B4B4B]" />
                    <StarIcon className="w-5 h-5 text-[#4B4B4B]" />
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