import React, { useEffect, useRef } from 'react';
import { useFaceDetectionContext } from '../context/FaceDetectionContext';

export const VideoCanvas: React.FC = () => {
  const { sdk, setElements } = useFaceDetectionContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const hasSetupRef = useRef(false);
  const setupAttemptedRef = useRef(false);

  useEffect(() => {
    console.log('[VideoCanvas] useEffect 실행됨');
    console.log('[VideoCanvas] SDK 상태:', { sdk: !!sdk });
    console.log('[VideoCanvas] DOM 요소들:', {
      video: !!videoRef.current,
      canvas: !!canvasRef.current,
      videoCanvas: !!videoCanvasRef.current,
    });

    // 이미 설정되었거나 시도 중이면 중복 실행 방지
    if (hasSetupRef.current || setupAttemptedRef.current) {
      console.log('[VideoCanvas] 이미 설정됨 또는 시도 중, 중복 실행 방지');
      return;
    }

    if (!sdk || !videoRef.current || !canvasRef.current || !videoCanvasRef.current) {
      console.log('[VideoCanvas] DOM 요소가 아직 준비되지 않음');
      return;
    }

    // DOM 요소들을 SDK에 전달하고 자동으로 시작
    const setupElements = async () => {
      try {
        console.log('[VideoCanvas] DOM 요소 설정 시작...');
        setupAttemptedRef.current = true;

        const container = document.querySelector('.face-detection-container') as HTMLElement;
        console.log('[VideoCanvas] Container 찾음:', !!container);

        if (!container) {
          console.error('[VideoCanvas] Container를 찾을 수 없습니다!');
          setupAttemptedRef.current = false; // 실패 시 다시 시도할 수 있도록
          return;
        }

        hasSetupRef.current = true;

        await setElements({
          video: videoRef.current!,
          canvasElement: canvasRef.current!,
          videoCanvas: videoCanvasRef.current!,
          container: container,
        });

        console.log('[VideoCanvas] DOM 요소 설정 완료');
      } catch (error) {
        console.error('[VideoCanvas] DOM 요소 설정 실패:', error);
        hasSetupRef.current = false; // 실패 시 다시 시도할 수 있도록
        setupAttemptedRef.current = false;
      }
    };

    setupElements();
  }, [sdk]); // setElements를 의존성에서 제거

  return (
    <>
      {/* 웹캠 비디오 스트림 */}
      <video
        ref={videoRef}
        className="input_video"
        muted
        width="640"
        height="480"
        autoPlay
        playsInline
      />

      {/* 얼굴 감지 결과를 그리는 캔버스 */}
      <canvas ref={canvasRef} className="output_canvas" width="320" height="240" />

      {/* 내부 처리용 비디오 캔버스 */}
      <canvas ref={videoCanvasRef} style={{ display: 'none' }} width="640" height="480" />
    </>
  );
};
