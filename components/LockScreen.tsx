import React, { useState } from 'react';
import { Button } from './shared/Button';
import { VnextLogo } from './VnextLogo';
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

    if (!VERIFY_LOCK_SCREEN_PROXY_URL || VERIFY_LOCK_SCREEN_PROXY_URL.includes('YOUR_PROJECT_ID')) {
      setError('Chức năng xác thực chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
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

      if (response.ok) {
        // Status 200-299
        const data = await response.json();
        if (data.success) {
          onUnlock();
          return; // Exit on success
        }
        // This case shouldn't happen with status 200, but as a safeguard
        setError(data.message || 'Một lỗi không mong muốn đã xảy ra.');
      } else {
        // Handle errors (4xx, 5xx)
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
      console.error('Lock screen verification failed:', err);
      setError('Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      // Clear answer only on failure, as success will navigate away
      setAnswer('');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-background mesh-bg overflow-hidden">
      {/* Một blob mờ — hiệu ứng nền duy nhất của màn này */}
      <div className="blob absolute -top-24 -right-16 w-80 h-80 bg-primary" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-orange-xl animate-scale-in">
        <div className="flex justify-center mb-6">
          <VnextLogo variant="stacked" height={96} />
        </div>
        <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-2">Xác thực quyền truy cập</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">Vui lòng trả lời câu hỏi sau để tiếp tục.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="secret-answer" className="block text-sm font-medium text-foreground mb-2">
              Tên đầy đủ full không che của club là gì:
            </label>
            <input
              id="secret-answer"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isLoading}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'secret-answer-error' : undefined}
              className="w-full h-10 px-4 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground text-sm
 transition-shadow duration-150 ease-spring
 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              placeholder="Nhập câu trả lời của bạn..."
              autoFocus
            />
          </div>

          {error && (
            <p id="secret-answer-error" role="alert" className="text-sm text-danger-text text-center">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isLoading || !answer.trim()}>
            {isLoading ? 'Đang kiểm tra...' : 'Mở khoá'}
          </Button>
        </form>
      </div>
    </div>
  );
};
