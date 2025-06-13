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
    const merged = JSON.parse(JSON.stringify(defaultConfig)) as any;

    Object.keys(userConfig).forEach((key) => {
      const userValue = userConfig[key as keyof FaceDetectionSDKConfig];
      if (userValue !== undefined) {
        if (key === 'elements') {
          merged[key] = userValue;
        } else if (typeof userValue === 'object' && !Array.isArray(userValue)) {
          merged[key] = { ...merged[key], ...userValue };
        } else {
          merged[key] = userValue;
        }
      }
    });

    return merged;
  }

  /**
   * 현재 설정을 반환합니다.
   */
  public getConfig(): Required<FaceDetectionSDKConfig> {
    return this.config;
  }

  /**
   * 특정 설정 값을 반환합니다.
   */
  public getConfigValue<K extends keyof Required<FaceDetectionSDKConfig>>(
    key: K,
  ): Required<FaceDetectionSDKConfig>[K] {
    return this.config[key];
  }
}
