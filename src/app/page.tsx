
'use client';

import { useState, useRef, useEffect, TouchEvent } from 'react';
import { Camera, Download } from 'lucide-react';

// マスコットキャラクターの情報を管理する型
type Mascot = {
  position: { x: number; y: number };
  scale: number;
  initialDistance: number | null;
  isDragging: boolean;
  isPinching: boolean;
  lastPosition: { x: number; y: number };
};

export default function MascotCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // マスコットキャラクターの状態を管理
  const [mascot, setMascot] = useState<Mascot>({
    position: { x: 50, y: 50 },
    scale: 0.5,
    initialDistance: null,
    isDragging: false,
    isPinching: false,
    lastPosition: { x: 0, y: 0 },
  });

  // カメラへのアクセス許可の状態
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  // 撮影した写真のデータURL
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // コンポーネントのマウント時にカメラをセットアップ
  useEffect(() => {
    let mediaStream: MediaStream | null = null;

    async function setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('カメラ機能は、このブラウザではサポートされていません。');
        setPermissionGranted(false);
        return;
      }
      try {
        // 背面カメラを優先して要求
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        mediaStream = stream; // クリーンアップ用にストリームを保持
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPermissionGranted(true);
      } catch (err) {
        console.error('カメラへのアクセスでエラーが発生しました:', err);
        setPermissionGranted(false);
      }
    }
    setupCamera();

    // コンポーネントがアンマウントされるときにカメラを停止する
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2点間の距離を計算するヘルパー関数
  const getDistance = (touches: React.TouchList): number => {
    // TouchListは配列のように分割代入できないため、インデックスでアクセスします
    const touch1 = touches[0];
    const touch2 = touches[1];
    // タッチ情報が2つ揃っていない場合は0を返す
    if (!touch1 || !touch2) return 0;
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  // タッチ開始時の処理
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // ドラッグ開始
      setMascot((prev) => ({
        ...prev,
        isDragging: true,
        lastPosition: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      }));
    } else if (e.touches.length === 2) {
      // ピンチ操作開始
      setMascot((prev) => ({
        ...prev,
        isPinching: true,
        initialDistance: getDistance(e.touches),
      }));
    }
  };

  // タッチしながら移動した時の処理
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (mascot.isDragging && e.touches.length === 1) {
      // ドラッグ中
      const touch = e.touches[0];
      const dx = touch.clientX - mascot.lastPosition.x;
      const dy = touch.clientY - mascot.lastPosition.y;
      setMascot((prev) => ({
        ...prev,
        position: { x: prev.position.x + dx, y: prev.position.y + dy },
        lastPosition: { x: touch.clientX, y: touch.clientY },
      }));
    } else if (mascot.isPinching && e.touches.length === 2) {
      // ピンチ操作中
      const newDistance = getDistance(e.touches);
      if (mascot.initialDistance) {
        setMascot((prev) => ({
          ...prev,
          scale: prev.scale * (newDistance / prev.initialDistance!),
          initialDistance: newDistance,
        }));
      }
    }
  };

  // タッチ終了時の処理
  const handleTouchEnd = () => {
    setMascot((prev) => ({
      ...prev,
      isDragging: false,
      isPinching: false,
      initialDistance: null,
    }));
  };

  // 撮影処理
  const handleCapture = () => {
    const video = videoRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (video && image && canvas) {
      const videoRect = video.getBoundingClientRect();
      canvas.width = videoRect.width;
      canvas.height = videoRect.height;

      const context = canvas.getContext('2d');
      if (context) {
        // 1. canvasにビデオの現在のフレームを描画
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. canvasにマスコットキャラクターを描画
        const imageRect = image.getBoundingClientRect();
        const scale = mascot.scale;
        const width = imageRect.width * scale;
        const height = imageRect.height * scale;
        // 画像の表示位置を計算（positionは画像の中心を指すように調整）
        const x = mascot.position.x - width / 2;
        const y = mascot.position.y - height / 2;

        context.drawImage(image, x, y, width, height);

        // 3. canvasの内容を画像データとして取得
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
      }
    }
  };

  // 写真をダウンロードする処理
  const handleDownload = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = 'mascot-photo.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // プレビューを閉じてカメラに戻る
  const handleBackToCamera = () => {
    setCapturedImage(null);
  };

  return (
    <div className="bg-gray-900 h-screen flex flex-col items-center justify-center font-sans">
      <main className="w-full max-w-[420px] h-[calc(100dvh)] bg-black flex flex-col justify-between shadow-lg overflow-hidden">
        {capturedImage ? (
          // 撮影後のプレビュー画面
          <div className="w-full h-full flex flex-col relative">
            <h2 className="text-white text-center p-4 bg-gray-800">プレビュー</h2>
            <div className="flex-grow flex items-center justify-center">
              <img src={capturedImage} alt="撮影した写真" className="max-w-full max-h-full" />
            </div>
            <div className="p-4 bg-gray-800/80 flex justify-around items-center">
              <button
                onClick={handleBackToCamera}
                className="text-white py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
              >
                撮り直す
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 text-white font-bold py-3 px-6 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg"
              >
                <Download size={20} />
                保存
              </button>
            </div>
          </div>
        ) : (
          // カメラ撮影画面
          <div className="w-full h-full flex flex-col relative">
            {permissionGranted === false && (
              <div className="absolute inset-0 bg-gray-800 text-white flex flex-col items-center justify-center text-center p-4 z-20">
                <h2 className="text-xl font-bold mb-2">カメラにアクセスできません</h2>
                <p>ブラウザの設定でカメラへのアクセスを許可してください。</p>
                <p className="mt-4 text-sm text-gray-400">（HTTPS接続が必要です）</p>
              </div>
            )}
            {permissionGranted === null && (
              <div className="absolute inset-0 bg-gray-800 text-white flex items-center justify-center z-20">
                <p>カメラを起動中...</p>
              </div>
            )}
            <div
              className="relative w-full flex-grow overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <img
                ref={imageRef}
                // ここに大学のマスコットキャラクターの画像パスを指定してください
                src="/drever_general.jpg"
                alt="Mascot"
                className="absolute touch-none"
                style={{
                  left: `${mascot.position.x}px`,
                  top: `${mascot.position.y}px`,
                  transform: `translate(-50%, -50%) scale(${mascot.scale})`,
                  cursor: 'move',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  willChange: 'transform',
                }}
                // 画像のドラッグイベントを無効化
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
            <div className="p-4 bg-black/50 flex justify-center items-center">
              <button
                onClick={handleCapture}
                disabled={!permissionGranted}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg ring-4 ring-white/30 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform duration-200 active:scale-90"
                aria-label="撮影"
              >
                <Camera size={40} className="text-gray-800" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </main>
    </div>
  );
}