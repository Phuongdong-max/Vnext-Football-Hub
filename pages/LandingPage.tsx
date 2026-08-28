import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, onAllPlayersUpdate } from '../services/firebaseService';
import { Tournament, TournamentTeam, TournamentPlayer } from '../types';
import { TOURNAMENT_DOC_ID, getTeamStyle, FALLBACK_TEAMS_FOR_DISPLAY } from '../constants';
import { TeamDetailModal } from '../components/Tournament/TeamDetailModal';
import { PlayerDetailModal } from '../components/Tournament/PlayerDetailModal';
import { Scene3DBoundary } from '../components/three/Scene3DBoundary';

const BallScene = React.lazy(() => import('../components/three/BallScene'));


const diamondSponsors = [
   "Chủ tịch VNext Holdings\nAnh Trần Ngọc Sơn",
    "Phó TGD VNext Japan\nAnh Đỗ Văn Hữu"
];

const platinumSponsors = [
    "Giám đốc VNext Japan\nAnh Mori Shuhei",
    "GĐ tài chính VNext Holdings\nAnh Nguyễn Trinh Hiếu",
    "Trưởng PKD Bu1 VNext Japan\nChị Bùi Thị Huệ",
    "Trưởng PKD Bu2 VNext Japan\nChị Phạm Đỗ Phương Nga",
    "Phòng BO VNext Japan\nChị Tạ Thị Thu Hằng"
];

const goldSponsors = [
    "Giám đốc VNext Software\nAnh Hoàng Hải",
    "Phòng kinh doanh\nChị Nguyễn Thị Thu Huyền",
    "Phòng phát triển\nAnh Nguyễn Thanh Tùng"
];

export const LandingPage: React.FC = () => {
    const { translate } = useLanguage();
    const { isFirebaseReady, addToast } = useAppContext();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);
    const [selectedSponsor, setSelectedSponsor] = useState('');
    
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
    const [isPlayerDetailModalOpen, setIsPlayerDetailModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<TournamentPlayer | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isFirebaseReady) return;
        const unsubTournament = onTournamentUpdate(TOURNAMENT_DOC_ID, setTournament);
        const unsubPlayers = onAllPlayersUpdate(setAllPlayers);
        return () => {
            unsubTournament();
            unsubPlayers();
        };
    }, [isFirebaseReady]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !contentRef.current) return;

            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            
            const xOffset = (clientX / innerWidth - 0.5) * -1; // Invert for natural feel
            const yOffset = (clientY / innerHeight - 0.5) * -1;

            // Apply a much more subtle parallax effect
            containerRef.current.style.backgroundPosition = `calc(50% + ${xOffset * 8}px) calc(50% + ${yOffset * 8}px)`;
            contentRef.current.style.transform = `translate(${xOffset * 4}px, ${yOffset * 4}px)`;
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleSponsorClick = (sponsorName: string) => {
        setSelectedSponsor(sponsorName);
        setIsThankYouModalOpen(true);
    };

    const handleTeamClick = (teamName: string) => {
        if (!tournament || !tournament.teams || tournament.teams.length === 0) {
            addToast('tournament.loading', 'info');
            return;
        }

        const liveTeam = tournament.teams.find(t => {
            const styleForClickedName = getTeamStyle(teamName);
            const styleForLiveTeam = getTeamStyle(t.name);
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

    const mailtoHref = `mailto:manhnv@vnext.vn?subject=${encodeURIComponent(
        'V/v: Đề Nghị Hợp Tác Tài Trợ Giải Bóng Đá VNEXT JAPAN OPEN CUP'
    )}&body=${encodeURIComponent(
        `Kính gửi Anh Mạnh,

Tôi là [Tên của bạn], đại diện cho [Tên công ty/Tổ chức của bạn].

Tôi viết email này để bày tỏ sự quan tâm đến việc hợp tác tài trợ cho giải đấu "VNEXT JAPAN OPEN CUP" do VNEXT JAPAN tổ chức.

Chúng tôi rất ấn tượng với quy mô và ý nghĩa của giải đấu. Chúng tôi mong muốn được trao đổi thêm về các gói tài trợ và cơ hội hợp tác để cùng đóng góp vào thành công của sự kiện.

Vui lòng cho tôi biết thời gian phù hợp để chúng ta có thể trao đổi chi tiết hơn.

Trân trọng,

[Tên của bạn]
[Chức vụ]
[Tên công ty/Tổ chức]
[Thông tin liên hệ (Số điện thoại, email)]`
    )}`;
    
    const teamDataForDisplay = FALLBACK_TEAMS_FOR_DISPLAY.map(fallbackTeam => {
        const style = getTeamStyle(fallbackTeam.name);
        return {
            ...fallbackTeam,
            image: style.imageSrc,
        };
    });

  return (
    <>
      <div
        ref={containerRef}
        className="min-h-screen bg-cover bg-center text-white font-sans overflow-hidden transition-all duration-500 ease-out relative"
        style={{ backgroundImage: "url('assets/stadium-bg.jpg')" }}
      >
        <Scene3DBoundary
          className="absolute inset-0 z-0 opacity-70"
          fallback={<div />}
        >
          <BallScene />
        </Scene3DBoundary>
        <div className="min-h-screen bg-black/40 backdrop-blur-[2px] p-4 sm:p-6 flex flex-col relative overflow-hidden shine-effect z-10">
          <div ref={contentRef} className="flex flex-col flex-grow transition-transform duration-500 ease-out relative z-10">

            {/* Header */}
            <header 
              className="flex flex-col md:flex-row justify-between items-center md:items-start text-xs sm:text-sm gap-y-4 gap-x-4 w-full will-animate"
              style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}
            >
              <div className="flex flex-col items-center text-center gap-2 w-full md:w-1/3 order-2 md:order-1">
                <p className="font-bold uppercase">Đơn vị tổ chức</p>
                <img src="assets/vnext.png" alt="VNEXT Logo" className="w-24 h-auto" />
              </div>
              <div className="text-center w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center gap-1">
                <span className="font-bold bg-white text-black px-3 py-1 rounded-md text-sm">VNEXT JAPAN株式会社</span>
                <p>GIẢI BÓNG ĐÁ NỘI BỘ</p>
                <p>CHÀO MỪNG KỈ NIỆM 8 NĂM THÀNH LẬP VNEXT JAPAN</p>
              </div>
              <div className="flex flex-col items-center text-center gap-2 w-full md:w-1/3 order-3">
                <p className="font-bold uppercase">Đơn vị đăng cai</p>
                <img src="assets/dang-cai-logo.png" alt="Đơn vị đăng cai" className="w-16 h-16 sm:w-20 sm:h-20" />
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center text-center my-8">
              <div 
                className="will-animate"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.2s forwards' }}
              >
                <div className="relative bg-black py-2 sm:py-4 px-8 sm:px-24 border-4 sm:border-8 border-orange-400 -skew-x-12 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-400/40">
                  <div className="absolute -top-3 -left-10 sm:-top-4 sm:-left-12 w-6 h-6 sm:w-8 sm:h-8 bg-purple-600"></div>
                  <div className="absolute -bottom-3 -right-10 sm:-bottom-4 sm:-right-12 w-6 h-6 sm:w-8 sm:h-8 bg-purple-600"></div>
                  <h1 className="text-3xl sm:text-6xl font-black tracking-wider skew-x-12 font-display tracking-wide">VNEXT JAPAN</h1>
                  <h2 className="text-4xl sm:text-7xl font-black text-orange-400 tracking-wider skew-x-12 font-display tracking-wide">OPEN CUP</h2>
                </div>
                <div className="mt-8">
                  <h3 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display tracking-wide">TỨ HÙNG TRANH ĐẤU</h3>
                  <p className="mt-2 text-lg sm:text-2xl font-semibold text-gray-200">Khát vọng bứt phá - Kết nối đam mê</p>
                </div>
              </div>

              <div 
                className="flex flex-wrap justify-center items-start gap-x-4 gap-y-8 sm:gap-x-8 mt-12 will-animate"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.4s forwards' }}
              >
                {teamDataForDisplay.map(team => (
                  <button key={team.id} onClick={() => handleTeamClick(team.name)} className="flex flex-col items-center gap-3 group">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-orange-400 p-2 transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:[filter:drop-shadow(0_0_15px_rgba(255,193,7,0.6))]">
                      <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                          <img src={team.image} alt={team.name} className="w-[170%] h-[170%] object-contain" />
                      </div>
                    </div>
                    <p className="font-bold text-lg bg-black/30 px-3 py-1 rounded-md transition-colors duration-300 group-hover:bg-black/60">{team.name}</p>
                  </button>
                ))}
              </div>
                
              <div 
                className="mt-12 will-animate"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.6s forwards' }}
              >
                {diamondSponsors.length > 0 && (
                    <div className="mb-8">
                        <h4 className="font-extrabold text-2xl border-b-2 border-purple-400 text-purple-300 inline-block px-4 pb-1 mb-4 text-center">
                            NHÀ TÀI TRỢ KIM CƯƠNG
                        </h4>
                        <div className="flex flex-wrap justify-center items-center gap-4 text-sm sm:text-base font-semibold whitespace-pre-line text-center">
                            {diamondSponsors.map(sponsor => (
                                <button key={sponsor} onClick={() => handleSponsorClick(sponsor)} className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-2 border-purple-300 p-4 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-400/40 text-center">{sponsor}</button>
                            ))}
                        </div>
                    </div>
                )}
                {platinumSponsors.length > 0 && (
                    <div className="mb-8">
                        <h4 className="font-extrabold text-xl border-b-2 border-slate-300 text-slate-100 inline-block px-4 pb-1 mb-4 text-center">
                            NHÀ TÀI TRỢ BẠCH KIM
                        </h4>
                        <div className="flex flex-wrap justify-center items-center gap-4 text-sm sm:text-base font-bold whitespace-pre-line text-center">
                            {platinumSponsors.map(sponsor => (
                                <button key={sponsor} onClick={() => handleSponsorClick(sponsor)} className="bg-gradient-to-br from-slate-200 to-slate-400 text-black border-2 border-slate-100 p-3 rounded-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-slate-300/40 text-center">{sponsor}</button>
                            ))}
                        </div>
                    </div>
                )}
                {goldSponsors.length > 0 && (
                    <div className="mb-8">
                        <h4 className="font-extrabold text-lg border-b-2 border-yellow-400 text-yellow-300 inline-block px-4 pb-1 mb-4 text-center">
                            NHÀ TÀI TRỢ VÀNG
                        </h4>
                        <div className="flex flex-wrap justify-center items-center gap-4 text-sm sm:text-base font-semibold whitespace-pre-line text-center">
                            {goldSponsors.map(sponsor => (
                                <button key={sponsor} onClick={() => handleSponsorClick(sponsor)} className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-black border-2 border-yellow-300 p-2 rounded-md shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/30 text-center">{sponsor}</button>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            </main>
            
            {/* Footer Info */}
            <footer 
              className="mt-auto pt-8 flex flex-col md:flex-row md:justify-between items-center gap-6 text-sm w-full will-animate"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.8s forwards' }}
            >
              <button 
                  onClick={() => setIsLocationModalOpen(true)}
                  className="bg-orange-400 text-black p-4 rounded-lg shadow-lg flex flex-col justify-center text-center md:w-auto h-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-400/40"
              >
                <p className="font-bold text-lg">Sân bonera FUTSAL FIELD,</p>
                <p className="font-semibold text-base">15:00-18:00 Ngày 04.10.2025</p>
              </button>
                <a 
                  href={mailtoHref} 
                  className="bg-orange-400 text-black p-4 rounded-lg shadow-lg flex flex-col justify-center text-center md:w-auto h-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-400/40"
                >
                    <p className="font-bold text-lg">Tài trợ xin liên hệ</p>
                    <p className="font-semibold text-base">manhnv@vnext.vn</p>
                </a>
            </footer>

            {/* Navigation Button */}
            <div 
              className="text-center mt-8 will-animate"
              style={{ animation: 'fadeInUp 0.6s ease-out 1s forwards' }}
            >
                <Link to="/home" className="inline-block bg-white text-orange-500 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-200 transition-all duration-300 text-lg transform hover:scale-105 hover:shadow-2xl hover:shadow-white/30">
                    {translate('landing.enterAppButton')}
                </Link>
            </div>
          </div>
        </div>
      </div>

      {isLocationModalOpen && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
            onClick={() => setIsLocationModalOpen(false)}
            style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
        >
            <div 
                className="bg-white text-black rounded-lg shadow-2xl max-w-lg w-full m-4 p-6 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
            >
                <button 
                    onClick={() => setIsLocationModalOpen(false)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-black transition-colors"
                    aria-label="Đóng"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Thông Tin Địa Điểm & Di Chuyển</h3>
                <div className="space-y-4 text-left text-gray-700">
                    <div>
                        <p className="font-semibold text-gray-800">Địa chỉ:</p>
                        <p>3 Chome-3-2 Komatsugawa, Edogawa City, Tokyo 132-0034</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">Cách di chuyển:</p>
                        <ul className="list-decimal list-inside space-y-1 mt-1 pl-2">
                            <li>Từ ga Hirai (Line Chūō-Sōbu) đi bộ.</li>
                            <li>Từ ga Hirai (Line Chūō-Sōbu) đi xe buýt <span className="font-mono bg-gray-200 px-1 rounded">평２３</span>.</li>
                            <li>Từ ga Kameido (Line Chūō-Sōbu) đi xe buýt <span className="font-mono bg-gray-200 px-1 rounded">錦２５</span> hoặc <span className="font-mono bg-gray-200 px-1 rounded">亀２６</span>.</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-6 space-y-4 text-center">
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">Lối vào tại ô vuông được đánh dấu</p>
                      <img src="assets/location.png" alt="Sơ đồ lối vào sân" className="w-full h-auto rounded-lg border border-gray-300 shadow-sm" />
                    </div>
                    <a 
                        href="https://www.google.com/maps/place/bonera+FUTSAL+FIELD/@35.6978187,139.8440284,653m/data=!3m2!1e3!4b1!4m6!3m5!1s0x60188899aa7fe353:0xcda7648e2f41ac3c!8m2!3d35.6978187!4d139.8466033!16s%2Fg%2F11bv1c2qc0?entry=ttu&g_ep=EgoyMDI1MDkwMy4wIKXMDSoASAFQAw%3D%3D"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-500 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Mở trên Google Maps
                    </a>
                </div>
            </div>
        </div>
      )}

      {isThankYouModalOpen && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
            onClick={() => setIsThankYouModalOpen(false)}
            style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
        >
            <div 
                className="bg-transparent max-w-2xl w-full m-4 relative"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
            >
                <button 
                    onClick={() => setIsThankYouModalOpen(false)}
                    className="absolute -top-3 -right-3 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/80 transition-colors z-10"
                    aria-label="Đóng"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <img src="assets/thank_you_card.png" alt={`Thư cảm ơn nhà tài trợ ${selectedSponsor}`} className="w-full h-auto rounded-lg shadow-2xl" />
            </div>
        </div>
      )}

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
      
      <style>{`
          .will-animate {
            opacity: 0;
            transform: translateY(20px);
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { 
              from { opacity: 0; transform: scale(0.95); } 
              to { opacity: 1; transform: scale(1); } 
          }
          @keyframes shine {
            0% {
              transform: translateX(-100%) skewX(-30deg);
              opacity: 0;
            }
            5% {
              opacity: 0.1;
            }
            20% {
              opacity: 0.1;
            }
            25% {
              transform: translateX(400%) skewX(-30deg);
              opacity: 0;
            }
            100% {
              transform: translateX(400%) skewX(-30deg);
              opacity: 0;
            }
          }
          .shine-effect::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 30%;
            height: 100%;
            background: linear-gradient(
              to right,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 1) 50%,
              rgba(255, 255, 255, 0) 100%
            );
            opacity: 0;
            z-index: 0;
            pointer-events: none;
            animation: shine 10s ease-in-out infinite;
          }
      `}</style>
    </>
  );
};