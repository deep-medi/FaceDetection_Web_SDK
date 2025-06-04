self.onmessage = function (e) {
  const { faceRegionData } = e.data;
  const data = new Uint32Array(faceRegionData.data.buffer); // Uint32Array로 변환
  const len = data.length;

  let sumRed = 0,
    sumGreen = 0,
    sumBlue = 0;

  for (let i = 0; i < len; i++) {
    const pixel = data[i];

    // 각각의 색상 채널을 추출
    sumRed += pixel & 0xff; // R
    sumGreen += (pixel >> 8) & 0xff; // G
    sumBlue += (pixel >> 16) & 0xff; // B
  }

  const sampledPixels = len;

  const result = {
    meanRed: sumRed / sampledPixels,
    meanGreen: sumGreen / sampledPixels,
    meanBlue: sumBlue / sampledPixels,
    timestamp: String(Date.now() * 1000),
  };

  self.postMessage(result);
};
