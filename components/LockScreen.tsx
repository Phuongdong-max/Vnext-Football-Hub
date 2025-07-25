

import React, { useState } from 'react';
import { Button } from './shared/Button';
import { VnfcLogoStatic } from './icons';
import { VERIFY_LOCK_SCREEN_PROXY_URL } from '../constants';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!VERIFY_LOCK_SCREEN_PROXY_URL || VERIFY_LOCK_SCREEN_PROXY_URL.includes("YOUR_PROJECT_ID")) {
      setError("Chức năng xác thực chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(VERIFY_LOCK_SCREEN_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer }),
      });

      if (response.ok) { // Status 200-299
        const data = await response.json();
        if (data.success) {
          onUnlock();
          return; // Exit on success
        }
        // This case shouldn't happen with status 200, but as a safeguard
        setError(data.message || 'Một lỗi không mong muốn đã xảy ra.');
      } else { // Handle errors (4xx, 5xx)
        if (response.status === 401) {
          setError('Câu trả lời không chính xác. Vui lòng thử lại.');
        } else {
          try {
            const errorData = await response.json();
            setError(errorData.message || `Lỗi máy chủ: ${response.status}.`);
          } catch {
            setError(`Lỗi máy chủ: ${response.status}. Vui lòng thử lại sau.`);
          }
        }
      }
    } catch (err) {
      console.error("Lock screen verification failed:", err);
      setError('Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      // Clear answer only on failure, as success will navigate away
      setAnswer('');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white animated-gradient-bg">
      <div className="relative z-10 w-full max-w-md p-8 bg-surface/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        <VnfcLogoStatic className="w-20 h-20 mx-auto mb-6" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}/>
        <h1 className="text-2xl font-bold text-center text-white mb-2" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
          Xác thực quyền truy cập
        </h1>
        <p className="text-center text-slate-300 mb-6">
          Vui lòng trả lời câu hỏi sau để tiếp tục.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="secret-answer" className="block text-sm font-medium text-slate-200 mb-2">
              Tên đầy đủ full không che của club là gì:
            </label>
            <input
              id="secret-answer"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-slate-800 text-white placeholder-slate-400"
              placeholder="Nhập câu trả lời của bạn..."
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <Button type="submit" fullWidth disabled={isLoading || !answer.trim()}>
            {isLoading ? 'Đang kiểm tra...' : 'Mở khóa'}
          </Button>
        </form>
      </div>
    </div>
  );
};