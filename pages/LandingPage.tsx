import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, onAllPlayersUpdate } from '../services/firebaseService';
import { Tournament, TournamentTeam, TournamentPlayer } from '../types';
import { TOURNAMENT_DOC_ID, getTeamStyle, FALLBACK_TEAMS_FOR_DISPLAY } from '../constants';
import { TeamDetailModal } from '../components/Tournament/TeamDetailModal';
import { PlayerDetailModal } from '../components/Tournament/PlayerDetailModal';
import { StadiumField3D } from '../components/StadiumField3D';
import { VnextLogo } from '../components/VnextLogo';
import { Modal } from '../components/shared/Modal';
import { MapPinIcon, XIcon } from '../components/icons';

const diamondSponsors = ['Chủ tịch VNext Holdings\nAnh Trần Ngọc Sơn', 'Phó TGD VNext Japan\nAnh Đỗ Văn Hữu'];

const platinumSponsors = [
  'Giám đốc VNext Japan\nAnh Mori Shuhei',
  'GĐ tài chính VNext Holdings\nAnh Nguyễn Trinh Hiếu',
  'Trưởng PKD Bu1 VNext Japan\nChị Bùi Thị Huệ',
  'Trưởng PKD Bu2 VNext Japan\nChị Phạm Đỗ Phương Nga',
  'Phòng BO VNext Japan\nChị Tạ Thị Thu Hằng',
];

const goldSponsors = [
  'Giám đốc VNext Software\nAnh Hoàng Hải',
  'Phòng kinh doanh\nChị Nguyễn Thị Thu Huyền',
  'Phòng phát triển\nAnh Nguyễn Thanh Tùng',
];

/** Một hạng tài trợ. Phân cấp bằng cỡ chữ và khoảng trắng, không bằng màu cầu vồng. */
const SponsorTier: React.FC<{
  label: string;
  sponsors: string[];
  tone: 'diamond' | 'platinum' | 'gold';
  onSelect: (sponsor: string) => void;
}> = ({ label, sponsors, tone, onSelect }) => {
  if (sponsors.length === 0) return null;

  const tierStyles = {
    diamond: {
      heading: 'text-base',
      badge: 'btn-gradient',
      card: 'p-5 text-base bg-card border-primary/25 shadow-orange-md',
    },
    platinum: {
      heading: 'text-sm',
      badge: 'bg-primary/10 text-vnext-deep dark:text-primary',
      card: 'p-4 text-sm bg-card border-border shadow-orange-sm',
    },
    gold: {
      heading: 'text-sm',
      badge: 'bg-muted text-muted-foreground',
      card: 'p-3 text-sm bg-card/80 border-border shadow-orange-sm',
    },
  }[tone];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-center gap-3 mb-5">
        <span
          className={`inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-semibold ${tierStyles.badge}`}
        >
          {label}
        </span>
        <span className="h-px flex-1 max-w-[120px] bg-border" aria-hidden="true" />
      </div>
      <div className="flex flex-wrap justify-center items-stretch gap-3 sm:gap-4">
        {sponsors.map((sponsor) => (
          <button
            key={sponsor}
            onClick={() => onSelect(sponsor)}
            className={`rounded-lg border font-medium whitespace-pre-line text-center text-foreground
 card-hover-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
                                    ${tierStyles.card} ${tierStyles.heading}`}
          >
            {sponsor}
          </button>
        ))}
      </div>
    </section>
  );
};

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

  useEffect(() => {
    if (!isFirebaseReady) return;
    const unsubTournament = onTournamentUpdate(TOURNAMENT_DOC_ID, setTournament);
    const unsubPlayers = onAllPlayersUpdate(setAllPlayers);
    return () => {
      unsubTournament();
      unsubPlayers();
    };
  }, [isFirebaseReady]);

  const handleSponsorClick = (sponsorName: string) => {
    setSelectedSponsor(sponsorName);
    setIsThankYouModalOpen(true);
  };

  const handleTeamClick = (teamName: string) => {
    if (!tournament || !tournament.teams || tournament.teams.length === 0) {
      addToast('tournament.loading', 'info');
      return;
    }

    const liveTeam = tournament.teams.find((t) => {
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
    setIsTeamModalOpen(false);
    setIsPlayerDetailModalOpen(true);
  };

  const mailtoHref = `mailto:manhnv@vnext.vn?subject=${encodeURIComponent(
    'V/v: Đề Nghị Hợp Tác Tài Trợ Giải Bóng Đá VNEXT JAPAN OPEN CUP',
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
[Thông tin liên hệ (Số điện thoại, email)]`,
  )}`;

  const teamDataForDisplay = FALLBACK_TEAMS_FOR_DISPLAY.map((fallbackTeam) => ({
    ...fallbackTeam,
    image: getTeamStyle(fallbackTeam.name).imageSrc,
  }));

  return (
    <>
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        {/* Nền 3D — vùng chuyển động duy nhất của màn này */}
        <StadiumField3D />

        <div className="relative z-10 flex flex-col min-h-screen px-4 sm:px-6 py-6">
          {/* Đơn vị tổ chức / tên giải / đơn vị đăng cai */}
          <header className="w-full grid grid-cols-1 md:grid-cols-3 items-start gap-6 animate-slide-up">
            <div className="flex flex-col items-center gap-2 order-2 md:order-1">
              <p className="text-xs font-medium text-muted-foreground">Đơn vị tổ chức</p>
              <VnextLogo variant="horizontal" height={30} />
            </div>

            <div className="flex flex-col items-center text-center gap-2 order-1 md:order-2">
              <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-semibold btn-gradient">
                VNEXT JAPAN株式会社
              </span>
              <p className="text-sm font-medium text-foreground">Giải bóng đá nội bộ</p>
              <p className="text-sm text-muted-foreground">Chào mừng kỉ niệm 9 năm thành lập VNEXT JAPAN</p>
            </div>

            <div className="flex flex-col items-center gap-2 order-3">
              <p className="text-xs font-medium text-muted-foreground">Đơn vị đăng cai</p>
              <img src="assets/dang-cai-logo.png" alt="Đơn vị đăng cai" className="w-16 h-16 object-contain" />
            </div>
          </header>

          <main className="flex-grow flex flex-col items-center justify-center text-center py-14">
            <div className="animate-slide-up vn-delay-1">
              <h1 className="font-heading font-bold leading-[1.05] text-[clamp(2.25rem,1.4rem+3.4vw,4rem)]">
                <span className="block text-foreground">VNEXT JAPAN</span>
                <span className="block gradient-text">OPEN CUP</span>
              </h1>
              <p className="mt-5 font-heading font-semibold text-[clamp(1.25rem,1rem+1.2vw,1.75rem)] text-foreground">
                Tứ hùng tranh đấu
              </p>
              <p className="mt-2 text-base text-muted-foreground">Khát vọng bứt phá — Kết nối đam mê</p>
            </div>

            {/* Bốn đội */}
            <div className="flex flex-wrap justify-center items-start gap-6 sm:gap-8 mt-12 animate-slide-up vn-delay-2">
              {teamDataForDisplay.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleTeamClick(team.name)}
                  className="group flex flex-col items-center gap-3 rounded-xl p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-border bg-card grid place-items-center overflow-hidden
 shadow-orange-sm transition-all duration-350 ease-spring
 group-hover:-translate-y-1 group-hover:shadow-orange-lg group-hover:border-primary/30"
                  >
                    <img src={team.image} alt="" className="w-[150%] h-[150%] object-contain" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">{team.name}</span>
                </button>
              ))}
            </div>

            {/* Nhà tài trợ */}
            <div className="mt-16 w-full max-w-4xl animate-slide-up vn-delay-3">
              <SponsorTier
                label="Nhà tài trợ kim cương"
                sponsors={diamondSponsors}
                tone="diamond"
                onSelect={handleSponsorClick}
              />
              <SponsorTier
                label="Nhà tài trợ bạch kim"
                sponsors={platinumSponsors}
                tone="platinum"
                onSelect={handleSponsorClick}
              />
              <SponsorTier label="Nhà tài trợ vàng" sponsors={goldSponsors} tone="gold" onSelect={handleSponsorClick} />
            </div>
          </main>

          {/* Thời gian, địa điểm, liên hệ tài trợ */}
          <footer className="mt-auto w-full max-w-4xl mx-auto animate-slide-up vn-delay-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="rounded-xl border border-border bg-card p-5 text-left card-hover-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <MapPinIcon className="w-4 h-4" />
                  Địa điểm thi đấu
                </span>
                <p className="mt-2 font-heading font-semibold text-foreground">Sân bonera FUTSAL FIELD</p>
                <p className="mt-1 text-sm text-muted-foreground">15:00–18:00, ngày 04.10.2025</p>
                <span className="mt-3 inline-block text-sm font-medium text-vnext-deep dark:text-primary">
                  Xem đường đi
                </span>
              </button>

              <a
                href={mailtoHref}
                className="rounded-xl border border-border bg-card p-5 text-left card-hover-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="text-xs font-medium text-muted-foreground">Tài trợ giải đấu</span>
                <p className="mt-2 font-heading font-semibold text-foreground">Liên hệ ban tổ chức</p>
                <p className="mt-1 text-sm text-muted-foreground">manhnv@vnext.vn</p>
                <span className="mt-3 inline-block text-sm font-medium text-vnext-deep dark:text-primary">
                  Soạn email tài trợ
                </span>
              </a>
            </div>

            {/* Hành động chính duy nhất của trang */}
            <div className="text-center my-10">
              <Link
                to="/home"
                className="btn-gradient inline-flex items-center justify-center h-11 px-8 rounded-md text-base shadow-orange-md
 transition-all duration-250 ease-spring hover:-translate-y-px hover:shadow-orange-lg
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {translate('landing.enterAppButton')}
              </Link>
            </div>
          </footer>
        </div>
      </div>

      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Địa điểm và cách di chuyển"
        size="lg"
      >
        <div className="space-y-5 text-sm">
          <div>
            <p className="font-medium text-foreground">Địa chỉ</p>
            <p className="mt-1 text-muted-foreground">3 Chome-3-2 Komatsugawa, Edogawa City, Tokyo 132-0034</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Cách di chuyển</p>
            <ol className="mt-2 space-y-1.5 list-decimal list-inside text-muted-foreground">
              <li>Từ ga Hirai (Line Chūō-Sōbu) đi bộ.</li>
              <li>
                Từ ga Hirai (Line Chūō-Sōbu) đi xe buýt{' '}
                <span className="font-mono text-xs bg-muted text-foreground px-1.5 py-0.5 rounded-sm">평２３</span>.
              </li>
              <li>
                Từ ga Kameido (Line Chūō-Sōbu) đi xe buýt{' '}
                <span className="font-mono text-xs bg-muted text-foreground px-1.5 py-0.5 rounded-sm">錦２５</span> hoặc{' '}
                <span className="font-mono text-xs bg-muted text-foreground px-1.5 py-0.5 rounded-sm">亀２６</span>.
              </li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-foreground">Lối vào tại ô vuông được đánh dấu</p>
            <img
              src="assets/location.png"
              alt="Sơ đồ lối vào sân"
              className="mt-2 w-full h-auto rounded-lg border border-border"
            />
          </div>
          <a
            href="https://www.google.com/maps/place/bonera+FUTSAL+FIELD/@35.6978187,139.8440284,653m/data=!3m2!1e3!4b1!4m6!3m5!1s0x60188899aa7fe353:0xcda7648e2f41ac3c!8m2!3d35.6978187!4d139.8466033!16s%2Fg%2F11bv1c2qc0?entry=ttu&g_ep=EgoyMDI1MDkwMy4wIKXMDSoASAFQAw%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium border border-border bg-card text-foreground
 transition-all duration-250 ease-spring hover:bg-primary/5 hover:border-primary/25
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MapPinIcon className="w-4 h-4" />
            Mở trên Google Maps
          </a>
        </div>
      </Modal>

      {isThankYouModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsThankYouModalOpen(false)}
          role="presentation"
        >
          <div className="relative max-w-2xl w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsThankYouModalOpen(false)}
              className="absolute -top-3 -right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground border border-border shadow-orange-lg
 transition-colors duration-150 ease-spring hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Đóng"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <img
              src="assets/thank_you_card.png"
              alt={`Thư cảm ơn nhà tài trợ ${selectedSponsor}`}
              className="w-full h-auto rounded-xl shadow-orange-xl"
            />
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
    </>
  );
};
