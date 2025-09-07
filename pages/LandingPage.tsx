import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const teamData = [
  { name: 'Fukuoka Kamikaze', image: 'assets/phoenix.png' },
  { name: 'Magical Feet', image: 'assets/dragon.png' },
  { name: 'V - All Star', image: 'assets/tiger.png' },
  { name: 'Không thể cản phá', image: 'assets/turtle.png' },
];

const sponsors = [
   "Chairman VNext - Mr. Son Tran",
    "SVP VNext Japan - Mr. Do Huu",
    "Sales Manager BU2 - Mrs. Pham Nga",
    "BO VNext Japan - Mrs. Ta Hang"
];

export const LandingPage: React.FC = () => {
    const { translate } = useLanguage();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

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

  return (
    <>
      <div className="min-h-screen bg-cover bg-center text-white font-sans overflow-x-hidden" style={{ backgroundImage: "url('assets/stadium-bg.jpg')" }}>
        <div className="min-h-screen bg-black/40 backdrop-blur-[2px] p-4 sm:p-6 flex flex-col">
          {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center md:items-start text-xs sm:text-sm gap-y-4 gap-x-4 w-full">
          {/* Left Side: Đơn vị tổ chức */}
          <div className="flex flex-col items-center text-center gap-2 w-full md:w-1/3 order-2 md:order-1">
            <p className="font-bold uppercase">Đơn vị tổ chức</p>
            <img src="assets/vnext.png" alt="VNEXT Logo" className="w-24 h-auto" />
          </div>

          {/* Middle Text */}
          <div className="text-center w-full md:w-1/3 order-1 md:order-2 flex flex-col items-center gap-1">
             <span className="font-bold bg-white text-black px-3 py-1 rounded-md text-sm">VNEXT JAPAN株式会社</span>
             <p>GIẢI BÓNG ĐÁ NỘI BỘ</p>
             <p>CHÀO MỪNG KỈ NIỆM 8 NĂM THÀNH LẬP VNEXT JAPAN</p>
          </div>
          
          {/* Right Side: Đơn vị đăng cai */}
          <div className="flex flex-col items-center text-center gap-2 w-full md:w-1/3 order-3">
             <p className="font-bold uppercase">Đơn vị đăng cai</p>
            <img src="assets/dang-cai-logo.png" alt="Đơn vị đăng cai" className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
        </header>


          {/* Main Content */}
          <main className="flex-grow flex flex-col items-center justify-center text-center my-8">
            {/* Main Banner */}
            <div className="relative bg-black py-2 sm:py-4 px-8 sm:px-24 border-4 sm:border-8 border-orange-400 -skew-x-12 shadow-2xl">
              <div className="absolute -top-3 -left-10 sm:-top-4 sm:-left-12 w-6 h-6 sm:w-8 sm:h-8 bg-purple-600"></div>
              <div className="absolute -bottom-3 -right-10 sm:-bottom-4 sm:-right-12 w-6 h-6 sm:w-8 sm:h-8 bg-purple-600"></div>
              <h1 className="text-3xl sm:text-6xl font-black tracking-wider skew-x-12">VNEXT JAPAN</h1>
              <h2 className="text-4xl sm:text-7xl font-black text-orange-400 tracking-wider skew-x-12">OPEN CUP</h2>
            </div>
            
            {/* Subtitle */}
            <div className="mt-8">
              <h3 className="text-4xl sm:text-6xl font-extrabold tracking-tight">TỨ HÙNG TRANH ĐẤU</h3>
              <p className="mt-2 text-lg sm:text-2xl font-semibold text-gray-200">Khát vọng bứt phá - Kết nối đam mê</p>
            </div>

            {/* Teams */}
            <div className="flex flex-wrap justify-center items-start gap-x-4 gap-y-8 sm:gap-x-8 mt-12">
              {teamData.map(team => (
                <div key={team.name} className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-orange-300/80 p-2 transform transition-transform hover:scale-105 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                        <img src={team.image} alt={team.name} className="w-[170%] h-[170%] object-contain" />
                    </div>
                  </div>
                  <p className="font-bold text-lg bg-black/30 px-3 py-1 rounded-md">{team.name}</p>
                </div>
              ))}
            </div>
              
            {/* Sponsors */}
            <div className="mt-12">
              <h4 className="font-extrabold text-lg border-b-2 border-orange-400 inline-block px-4 pb-1 mb-4 text-center">NHÀ TÀI TRỢ</h4>
              <div className="flex flex-wrap justify-center items-center gap-4 text-xs sm:text-sm font-semibold">
                  {sponsors.map(sponsor => (
                      <div key={sponsor} className="bg-white text-black border-2 border-orange-400 p-2 rounded-md shadow-md">{sponsor}</div>
                  ))}
              </div>
            </div>
          </main>
          
          {/* Footer Info */}
          <footer className="mt-auto pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm w-full">
            <button 
                onClick={() => setIsLocationModalOpen(true)}
                className="bg-orange-400 text-black p-4 rounded-lg shadow-lg flex flex-col justify-center text-center w-full md:w-auto h-full transition-transform hover:scale-105"
            >
              <p className="font-bold text-lg">Sân bonera FUTSAL FIELD,</p>
              <p className="font-semibold text-base">15:00-18:00 Ngày 04.10.2025</p>
            </button>
              <a href={mailtoHref} className="w-full md:w-auto">
                  <div className="bg-orange-400 text-black p-4 rounded-lg shadow-lg flex flex-col justify-center text-center h-full transition-transform hover:scale-105">
                      <p className="font-bold text-lg">Tài trợ xin liên hệ</p>
                      <p className="font-semibold text-base">manhnv@vnext.vn</p>
                  </div>
              </a>
          </footer>

          {/* Navigation Button */}
          <div className="text-center mt-8">
              <Link to="/home" className="inline-block bg-white text-orange-500 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-200 transition-all duration-300 text-lg transform hover:scale-105">
                  {translate('landing.enterAppButton')}
              </Link>
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
                className="bg-white text-black rounded-lg shadow-2xl max-w-lg w-full m-4 p-6 relative"
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
                            <li>Từ ga Hirai (Line Chūō-Sōbu) đi xe buýt <span className="font-mono bg-gray-200 px-1 rounded">平２３</span>.</li>
                            <li>Từ ga Kameido (Line Chūō-Sōbu) đi xe buýt <span className="font-mono bg-gray-200 px-1 rounded">錦２５</span> hoặc <span className="font-mono bg-gray-200 px-1 rounded">亀２６</span>.</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-6 text-center">
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
      <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { 
              from { opacity: 0; transform: scale(0.95); } 
              to { opacity: 1; transform: scale(1); } 
          }
      `}</style>
    </>
  );
};