import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appServiceMock = {
    getHealth: jest.fn(() =>
      Promise.resolve({
        status: 'ok' as const,
        db: 'ok' as const,
        redis: 'ok' as const,
        uptime: 1,
      }),
    ),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return service health status', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
        db: 'ok',
        redis: 'ok',
        uptime: 1,
      });
    });
  });
});
