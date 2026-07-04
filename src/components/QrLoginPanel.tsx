import { useEffect, useState } from 'react';
import { useNeteaseLogin } from '../hooks/useNeteaseLogin';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export default function QrLoginPanel({ isOpen, onClose, onLoginSuccess }: Props) {
  const {
    qrImg,
    qrStatus,
    qrMessage,
    qrError,
    startQrLogin,
    refreshQrCode,
    stopQrPolling,
    userInfo,
  } = useNeteaseLogin();

  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsExiting(false);
      startQrLogin();
    } else {
      stopQrPolling();
    }
    return () => stopQrPolling();
  }, [isOpen, startQrLogin, stopQrPolling]);

  useEffect(() => {
    if (userInfo.isLoggedIn && isOpen) {
      setTimeout(() => {
        onLoginSuccess?.();
        handleClose();
      }, 800);
    }
  }, [userInfo.isLoggedIn, isOpen, onLoginSuccess]);

  const handleClose = () => {
    if (isExiting) return;
    setIsExiting(true);
    stopQrPolling();
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 250);
  };

  if (!isOpen) return null;

  const getStatusText = () => {
    if (qrError) return qrError;
    if (qrStatus === 801) return qrMessage || '等待扫码...';
    if (qrStatus === 802) return '已扫码，请在手机上确认';
    if (qrStatus === 803) return '登录成功！';
    if (qrStatus === 800 && qrImg) return '二维码已过期，点击刷新';
    return '正在生成二维码...';
  };

  const getStatusColor = () => {
    if (qrError) return 'text-red-400';
    if (qrStatus === 803) return 'text-emerald-400';
    if (qrStatus === 802) return 'text-amber-400';
    if (qrStatus === 800 && qrImg) return 'text-amber-400';
    return 'text-white/70';
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center px-6 ${isExiting ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div 
        className={`relative w-full max-w-sm ${isExiting ? 'animate-modal-down' : 'animate-modal-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-3xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.08) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: `
              0 25px 60px rgba(0,0,0,0.5),
              0 8px 24px rgba(0,0,0,0.3),
              inset 0 1.5px 0 rgba(255,255,255,0.2),
              inset 0 -1px 0 rgba(0,0,0,0.2)
            `,
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center btn-press transition-all duration-200 active:scale-90"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-white">登录网易云音乐</h2>
            <p className="text-sm text-white/50 mt-1">登录后可播放 VIP 歌曲</p>
          </div>

          <div className="flex justify-center mb-5">
            <div 
              className="w-48 h-48 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {qrImg ? (
                <>
                  <img 
                    src={qrImg} 
                    alt="登录二维码" 
                    className="w-40 h-40 rounded-xl"
                    style={{ 
                      opacity: qrStatus === 800 ? 0.4 : 1,
                      transition: 'opacity 0.3s',
                    }}
                  />
                  {qrStatus === 802 && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">📱</div>
                        <p className="text-sm text-white font-medium">请在手机上确认</p>
                      </div>
                    </div>
                  )}
                  {qrStatus === 803 && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.2)', backdropFilter: 'blur(4px)' }}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2 animate-bounce">✓</div>
                        <p className="text-sm text-white font-bold">登录成功</p>
                      </div>
                    </div>
                  )}
                </>
              ) : qrError ? (
                <div className="text-center px-4">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="text-sm text-red-400">{qrError}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full"
                    style={{ animation: 'spin 0.8s linear infinite' }}
                  />
                  <p className="text-xs text-white/40 mt-3">生成中...</p>
                </div>
              )}
            </div>
          </div>

          <p className={`text-center text-sm mb-5 ${getStatusColor()}`}>
            {getStatusText()}
          </p>

          {(qrStatus === 800 || qrError) && qrImg && (
            <button
              onClick={refreshQrCode}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white btn-press transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              刷新二维码
            </button>
          )}

          {qrStatus === 801 && qrImg && (
            <div className="flex items-center justify-center gap-2 text-xs text-white/40">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
              />
              <span>等待扫码中...</span>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-xs text-white/30 text-center">
              使用网易云音乐 App 扫码登录
            </p>
            <p className="text-xs text-white/20 text-center mt-1">
              登录凭据仅保存在本地，不会上传
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out forwards;
        }
        .animate-fade-out {
          animation: fade-out 0.25s ease-in forwards;
        }
        @keyframes modal-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        .animate-modal-up {
          animation: modal-up 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
        }
        @keyframes modal-down {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            filter: blur(8px);
          }
        }
        .animate-modal-down {
          animation: modal-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
