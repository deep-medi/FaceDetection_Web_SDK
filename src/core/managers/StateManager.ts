import { FaceDetectionState, StateChangeCallback } from '../../types/index.js';
import { EventManager } from './EventManager.js';

export class StateManager {
  private currentState: FaceDetectionState = FaceDetectionState.INITIAL;
  private eventManager: EventManager;

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
  }

  /**
   * 현재 상태를 반환합니다.
   */
  public getCurrentState(): FaceDetectionState {
    return this.currentState;
  }

  /**
   * 상태를 변경하고 콜백을 호출합니다.
   */
  public setState(newState: FaceDetectionState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    this.eventManager.emitStateChange(newState, previousState);
  }

  /**
   * 상태 변경 콜백을 등록합니다.
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.eventManager.onStateChange(callback);
  }

  /**
   * 상태 변경 콜백을 제거합니다.
   */
  public removeStateChangeCallback(callback: StateChangeCallback): void {
    this.eventManager.removeStateChangeCallback(callback);
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
