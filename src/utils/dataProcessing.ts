// 데이터 처리 관련 유틸리티 함수들

/**
 * RGB 데이터와 타임스탬프를 탭으로 구분된 문자열로 변환하는 함수
 * @param r - 빨간색 값 배열
 * @param g - 초록색 값 배열
 * @param b - 파란색 값 배열
 * @param t - 타임스탬프 배열
 * @returns 탭으로 구분된 데이터 문자열 (형식: timestamp\tred\tgreen\tblue)
 */
export function createDataString(r: number[], g: number[], b: number[], t: number[]): string {
  return r.map((_, i) => `${t[i]}\t${r[i]}\t${g[i]}\t${b[i]}`).join('\n');
}
