export const __instances: MockPostHog[] = [];

export class MockPostHog {
  capture = jest.fn().mockResolvedValue(undefined);
  identify = jest.fn();
  reset = jest.fn();
  optIn = jest.fn().mockResolvedValue(undefined);
  optOut = jest.fn().mockResolvedValue(undefined);
  startSessionRecording = jest.fn().mockResolvedValue(undefined);
  stopSessionRecording = jest.fn().mockResolvedValue(undefined);

  constructor(
    public readonly apiKey: string,
    public readonly options: Record<string, unknown>,
  ) {
    __instances.push(this);
  }
}

export function __resetPostHogMock(): void {
  __instances.length = 0;
}

export default MockPostHog;
