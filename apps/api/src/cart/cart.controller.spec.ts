import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  documentedApiPath,
  setupSwagger,
  swaggerJsonPath,
} from '../http/setup-swagger';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  it('forwards the JWT user id to the service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], selectedAmount: 0 });
    const controller = new CartController({
      list,
      add: jest.fn(),
      patch: jest.fn(),
      remove: jest.fn(),
    } as unknown as CartService);

    await controller.list({ id: 'u1' });
    expect(list).toHaveBeenCalledWith('u1');
  });

  it('documents cart routes with bearer auth in Swagger', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            list: jest.fn(),
            add: jest.fn(),
            patch: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupSwagger(app);
    await app.init();

    const res = await request(app.getHttpServer()).get(swaggerJsonPath());
    const paths = res.body.paths as Record<string, unknown>;
    expect(paths[documentedApiPath('/cart')]).toBeDefined();
    expect(paths[documentedApiPath('/cart/{id}')]).toBeDefined();

    await app.close();
  });
});
