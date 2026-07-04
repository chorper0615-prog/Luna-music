import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getNeteaseUser, 
  setNeteaseUser, 
  setNeteaseCookie, 
  clearNeteaseCookie,
  apiGet,
} from '../utils/neteaseAuth';

export interface NeteaseUserInfo {
  isLoggedIn: boolean;
  userId?: number;
  nickname?: string;
  avatarUrl?: string;
  vipType?: number;
}

const STATUS_POLL_INTERVAL = 2000;
const QR_EXPIRE_MS = 180000;

export function useNeteaseLogin() {
  const [userInfo, setUserInfo] = useState<NeteaseUserInfo>({ isLoggedIn: false });
  const [loading, setLoading] = useState(true);
  const [qrKey, setQrKey] = useState('');
  const [qrImg, setQrImg] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrStatus, setQrStatus] = useState<number>(800);
  const [qrMessage, setQrMessage] = useState('');
  const [qrError, setQrError] = useState('');
  const pollTimerRef = useRef<number | null>(null);
  const qrCreatedAtRef = useRef<number>(0);

  const checkLoginStatus = useCallback(async () => {
    try {
      const data = await apiGet('/api/login/status');
      if (data.code === 200 && data.data) {
        const userData = data.data;
        setUserInfo(userData);
        setNeteaseUser(userData);
        return userData;
      }
    } catch (e) {
      console.warn('Check login status failed:', e);
    }
    return { isLoggedIn: false };
  }, []);

  useEffect(() => {
    const savedUser = getNeteaseUser();
    if (savedUser?.isLoggedIn) {
      setUserInfo(savedUser);
      setLoading(false);
      checkLoginStatus();
    } else {
      checkLoginStatus().finally(() => setLoading(false));
    }
  }, [checkLoginStatus]);

  const generateQrCode = useCallback(async () => {
    setQrError('');
    setQrStatus(800);
    setQrMessage('');
    try {
      const keyData = await apiGet('/api/login/qr/key');
      if (keyData.code !== 200 || !keyData.data?.unikey) {
        throw new Error('获取二维码Key失败');
      }
      const key = keyData.data.unikey;
      setQrKey(key);

      const qrData = await apiGet('/api/login/qr/create', { key });
      if (qrData.code !== 200 || !qrData.data?.qrimg) {
        throw new Error('生成二维码失败');
      }
      setQrImg(qrData.data.qrimg);
      setQrUrl(qrData.data.qrurl || '');
      qrCreatedAtRef.current = Date.now();
      setQrStatus(801);
      setQrMessage('请使用网易云音乐APP扫码登录');

      return key;
    } catch (e: any) {
      setQrError(e.message || '生成二维码失败');
      setQrImg('');
      return null;
    }
  }, []);

  const startQrPolling = useCallback((key: string) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const poll = async () => {
      if (Date.now() - qrCreatedAtRef.current > QR_EXPIRE_MS) {
        setQrStatus(800);
        setQrMessage('二维码已过期，请刷新');
        setQrImg('');
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        return;
      }

      try {
        const data = await apiGet('/api/login/qr/check', { key });
        const code = data.code || 800;
        setQrStatus(code);
        setQrMessage(data.message || '');

        if (code === 803) {
          if (data.cookie) {
            setNeteaseCookie(data.cookie);
          }
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setTimeout(async () => {
            await checkLoginStatus();
          }, 500);
        } else if (code === 800) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setQrImg('');
        }
      } catch (e) {
        console.warn('QR poll error:', e);
      }
    };

    poll();
    pollTimerRef.current = window.setInterval(poll, STATUS_POLL_INTERVAL);
  }, [checkLoginStatus]);

  const startQrLogin = useCallback(async () => {
    setQrError('');
    const key = await generateQrCode();
    if (key) {
      startQrPolling(key);
    }
  }, [generateQrCode, startQrPolling]);

  const refreshQrCode = useCallback(() => {
    startQrLogin();
  }, [startQrLogin]);

  const stopQrPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiGet('/api/logout');
    } catch (e) {
      console.warn('Logout error:', e);
    }
    clearNeteaseCookie();
    setUserInfo({ isLoggedIn: false });
  }, []);

  useEffect(() => {
    return () => {
      stopQrPolling();
    };
  }, [stopQrPolling]);

  return {
    userInfo,
    loading,
    qrKey,
    qrImg,
    qrUrl,
    qrStatus,
    qrMessage,
    qrError,
    startQrLogin,
    refreshQrCode,
    stopQrPolling,
    logout,
    checkLoginStatus,
  };
}
