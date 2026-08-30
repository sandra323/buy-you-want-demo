import {
  ProductExposureTracker,
  createThrottledRunner,
} from './product-exposure';

describe('ProductExposureTracker', () => {
  it('reports visible products once in a session and resets on next focus', () => {
    const tracker = new ProductExposureTracker();
    tracker.setLayout('first', { y: 0, height: 100 });
    tracker.setLayout('second', { y: 180, height: 100 });

    expect(tracker.collectVisible({ y: 0, height: 150 })).toEqual(['first']);
    expect(tracker.collectVisible({ y: 0, height: 150 })).toEqual([]);
    expect(tracker.collectVisible({ y: 150, height: 150 })).toEqual(['second']);

    tracker.resetSession();
    expect(tracker.collectVisible({ y: 0, height: 150 })).toEqual(['first']);
  });

  it('does not report mostly off-screen or removed products', () => {
    const tracker = new ProductExposureTracker();
    tracker.setLayout('partial', { y: 90, height: 100 });
    tracker.setLayout('removed', { y: 0, height: 100 });
    tracker.retainProducts(['partial']);

    expect(tracker.collectVisible({ y: 0, height: 100 })).toEqual([]);
    expect(tracker.collectVisible({ y: 40, height: 100 })).toEqual(['partial']);
  });
});

describe('createThrottledRunner', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('coalesces repeated work within two hundred milliseconds', () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const callback = jest.fn();
    const runner = createThrottledRunner(callback, 200);

    runner.run();
    jest.advanceTimersByTime(50);
    runner.run();
    jest.advanceTimersByTime(50);
    runner.run();

    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
