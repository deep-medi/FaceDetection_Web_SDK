/**
 * 데이터 다운로드 유틸리티
 * 플랫폼별 다운로드 기능을 통합 제공
 */

export interface DownloadConfig {
  enabled: boolean;
  autoDownload: boolean;
  filename: string;
}

export interface PlatformConfig {
  isAndroid?: boolean;
  isIOS?: boolean;
}

/**
 * 자동 다운로드 수행
 */
export function performAutoDownload(
  dataString: string,
  filename: string,
  platformConfig: PlatformConfig,
): void {
  if (platformConfig.isAndroid) {
    // Android 플랫폼용 다운로드 로직
    if (typeof (window as any).Android !== 'undefined') {
      (window as any).Android.downloadRgbData(dataString);
    } else {
      downloadAsFile(dataString, filename);
    }
  } else if (platformConfig.isIOS) {
    // iOS 플랫폼용 다운로드 로직
    if (typeof (window as any).webkit !== 'undefined') {
      (window as any).webkit.messageHandlers.downloadRgbData.postMessage(dataString);
    } else {
      downloadAsFile(dataString, filename);
    }
  } else {
    // 웹 브라우저용 자동 다운로드
    downloadAsFile(dataString, filename);
  }
}

/**
 * 다운로드 다이얼로그 표시 (새 창)
 */
export function showDownloadDialog(dataString: string, filename: string): void {
  const downloadWindow = window.open(
    '',
    '_blank',
    'width=500,height=400,scrollbars=yes,resizable=yes',
  );

  if (!downloadWindow) {
    alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
    return;
  }

  const currentDate = new Date().toLocaleString('ko-KR');

  downloadWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RGB 데이터 다운로드</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 450px;
          margin: 0 auto;
        }
        h2 {
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
        .info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #2196f3;
        }
        .info p {
          margin: 5px 0;
          color: #1976d2;
        }
        .data-preview {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 10px;
          margin: 15px 0;
          max-height: 100px;
          overflow-y: auto;
          font-family: monospace;
          font-size: 12px;
          color: #495057;
        }
        .buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
          min-width: 100px;
        }
        .download-btn {
          background-color: #4caf50;
          color: white;
        }
        .download-btn:hover {
          background-color: #45a049;
        }
        .cancel-btn {
          background-color: #f44336;
          color: white;
        }
        .cancel-btn:hover {
          background-color: #da190b;
        }
        .copy-btn {
          background-color: #2196f3;
          color: white;
        }
        .copy-btn:hover {
          background-color: #1976d2;
        }
        @media (max-width: 480px) {
          .buttons {
            flex-direction: column;
          }
          button {
            width: 100%;
            margin: 5px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>📊 RGB 데이터 다운로드</h2>
        
        <div class="info">
          <p><strong>측정 완료 시간:</strong> ${currentDate}</p>
          <p><strong>파일명:</strong> ${filename}</p>
          <p><strong>데이터 크기:</strong> ${(dataString.length / 1024).toFixed(2)} KB</p>
          <p><strong>데이터 라인 수:</strong> ${dataString.split('\n').length.toLocaleString()}</p>
        </div>

        <div class="data-preview">
          <strong>데이터 미리보기:</strong><br>
          ${dataString.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${dataString.length > 200 ? '...' : ''}
        </div>

        <div class="buttons">
          <button class="download-btn" onclick="downloadData()">
            💾 다운로드
          </button>
          <button class="copy-btn" onclick="copyToClipboard()">
            📋 복사
          </button>
          <button class="cancel-btn" onclick="window.close()">
            ❌ 취소
          </button>
        </div>
      </div>

      <script>
        const dataString = ${JSON.stringify(dataString)};
        const filename = ${JSON.stringify(filename)};

        function downloadData() {
          try {
            // 사용자 정보 가져오기 (파일명에 사용)
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            
            // 현재 날짜와 시간을 포맷팅 (YYYYMMDD_HHMM 형식)
            const now = new Date();
            const dateStr = now.getFullYear() + 
                          ('0' + (now.getMonth() + 1)).slice(-2) + 
                          ('0' + now.getDate()).slice(-2) + 
                          '_' +
                          ('0' + now.getHours()).slice(-2) + 
                          ('0' + now.getMinutes()).slice(-2);
            
            // 고유한 파일명 생성
            const finalFilename = userData.userId ? 
              \`rgb_data_\${userData.userId}_\${dateStr}.txt\` : 
              \`\${filename.replace('.txt', '')}_\${dateStr}.txt\`;

            const blob = new Blob([dataString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('다운로드가 시작되었습니다.');
          } catch (error) {
            console.error('다운로드 오류:', error);
            alert('다운로드 중 오류가 발생했습니다.');
          }
        }

        function copyToClipboard() {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(dataString).then(() => {
              alert('데이터가 클립보드에 복사되었습니다.');
            }).catch(err => {
              console.error('복사 실패:', err);
              fallbackCopyTextToClipboard();
            });
          } else {
            fallbackCopyTextToClipboard();
          }
        }

        function fallbackCopyTextToClipboard() {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = dataString;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('데이터가 클립보드에 복사되었습니다.');
          } catch (err) {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다. 수동으로 복사해주세요.');
          }
        }
      </script>
    </body>
    </html>
  `);

  downloadWindow.document.close();
}

/**
 * 파일 다운로드 (웹 브라우저용)
 */
export function downloadAsFile(dataString: string, filename: string): void {
  const blob = new Blob([dataString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 통합 다운로드 함수
 */
export function handleDataDownload(
  dataString: string,
  config: DownloadConfig,
  platformConfig: PlatformConfig,
  logger?: (message: string) => void,
): void {
  // 데이터 다운로드가 비활성화된 경우
  if (!config.enabled) {
    logger?.('데이터 다운로드가 비활성화되어 있습니다.');
    return;
  }

  if (config.autoDownload) {
    // 자동 다운로드 모드
    performAutoDownload(dataString, config.filename, platformConfig);
    logger?.('자동 다운로드를 실행했습니다.');
  } else {
    // 새 창에서 사용자 입력으로 다운로드
    showDownloadDialog(dataString, config.filename);
    logger?.('다운로드 다이얼로그를 표시했습니다.');
  }
}
