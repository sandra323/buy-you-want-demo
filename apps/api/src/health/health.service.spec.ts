import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const uptimeSpy = jest.spyOn(process, 'uptime');

  afterEach(() => {
    uptimeSpy.mockReset();
  });

  afterAll(() => {
    uptimeSpy.mockRestore();
  });

  it('maps a successful TypeORM ping to db up', async () => {
    uptimeSpy.mockReturnValue(12.9);
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    } as unknown as DataSource;

    const result = await new HealthService(dataSource).check();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual({
      status: 'ok',
      db: 'up',
      uptimeSec: 12,
    });
  });

  it('maps a failed ping to db down without throwing', async () => {
    uptimeSpy.mockReturnValue(3);
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    } as unknown as DataSource;

    await expect(new HealthService(dataSource).check()).resolves.toEqual({
      status: 'error',
      db: 'down',
      uptimeSec: 3,
    });
  });

  it('treats a closed DataSource as down', async () => {
    uptimeSpy.mockReturnValue(1);
    const dataSource = {
      isInitialized: false,
      query: jest.fn(),
    } as unknown as DataSource;

    await expect(new HealthService(dataSource).check()).resolves.toEqual({
      status: 'error',
      db: 'down',
      uptimeSec: 1,
    });
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
