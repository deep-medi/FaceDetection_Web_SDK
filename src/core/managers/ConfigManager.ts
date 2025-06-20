import { FaceDetectionSDKConfig } from '../../types/index.js';
import { DEFAULT_SDK_CONFIG } from '@/config/defaultConfig.js';

export class ConfigManager {
  private config: Required<FaceDetectionSDKConfig>;

  constructor(userConfig: FaceDetectionSDKConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_SDK_CONFIG, userConfig);
  }

  /**
   * 설정 병합 (깊은 병합)
   */
  private mergeConfig(
    defaultConfig: Omit<Required<FaceDetectionSDKConfig>, 'elements'>,
    userConfig: FaceDetectionSDKConfig,
  ): Required<FaceDetectionSDKConfig> {
    const merged = structuredClone(defaultConfig) as any;

    return Object.entries(userConfig).reduce((acc, [key, value]) => {
      if (value === undefined) return acc;
      acc[key] =
        key === 'elements'
          ? value
          : typeof value === 'object' && !Array.isArray(value)
            ? { ...acc[key], ...value }
            : value;
      return acc;
    }, merged);
  }

  /**
   * 현재 설정을 반환합니다.
   */
  public getConfig(): Required<FaceDetectionSDKConfig> {
    return this.config;
  }
}
