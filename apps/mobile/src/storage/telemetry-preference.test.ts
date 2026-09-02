import {
  readTelemetryOptOut,
  TELEMETRY_OPT_OUT_KEY,
  writeTelemetryOptOut,
} from './telemetry-preference';
import { __resetAsyncStorage, setItem } from '../test/mocks/async-storage';

describe('telemetry preference', () => {
  beforeEach(() => __resetAsyncStorage());

  it('defaults to opt-in and persists both values', async () => {
    await expect(readTelemetryOptOut()).resolves.toBe(false);
    await writeTelemetryOptOut(true);
    await expect(readTelemetryOptOut()).resolves.toBe(true);
    await writeTelemetryOptOut(false);
    await expect(readTelemetryOptOut()).resolves.toBe(false);
  });

  it('rejects corrupted persisted values', async () => {
    await setItem(TELEMETRY_OPT_OUT_KEY, 'maybe');
    await expect(readTelemetryOptOut()).rejects.toThrow(
      'Invalid telemetry preference',
    );
  });
});
