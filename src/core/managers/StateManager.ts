import { FaceDetectionState, StateChangeCallback } from '../../types/index.js';

export class StateManager {
  private currentState: FaceDetectionState = FaceDetectionState.INITIAL;
  private stateChangeCallback?: StateChangeCallback;

  constructor() {}

  /**
   * 현재 상태를 반환합니다.
   */
  public getCurrentState(): FaceDetectionState {
    return this.currentState;
  }

  /**
   * 상태 변경 콜백을 설정합니다.
   */
  public setStateChangeCallback(callback: StateChangeCallback): void {
    this.stateChangeCallback = callback;
  }

  /**
   * 상태를 변경하고 이벤트를 발생시킵니다.
   */
  public setState(newState: FaceDetectionState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    this.emitStateChange(newState, previousState);
  }

  /**
   * 상태 변경 이벤트를 발생시킵니다.
   */
  private emitStateChange(newState: FaceDetectionState, previousState: FaceDetectionState): void {
    try {
      this.stateChangeCallback?.(newState, previousState);
    } catch (error) {
      console.error('상태 변경 콜백 실행 중 오류:', error);
    }
  }

  /**
   * 특정 상태인지 확인합니다.
   */
  public isState(state: FaceDetectionState): boolean {
    return this.currentState === state;
  }

  /**
   * 여러 상태 중 하나인지 확인합니다.
   */
  public isAnyState(...states: FaceDetectionState[]): boolean {
    return states.includes(this.currentState);
  }
}
