import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

/**
 * Smoke test das rotas triviais do root (`/` e `/health`).
 *
 * ⚠️ Monta APENAS o AppController + AppService, de propósito. Antes isto
 * importava o `AppModule` inteiro, que traz `BullModule.forRoot` (Redis) e as
 * filas do EmailModule. O `app.close()` fechava a conexão, mas o ioredis do
 * BullMQ ainda emitia um `error` ASSÍNCRONO ("Connection is closed.") depois
 * do fim da suíte — e o Jest atribuía esse unhandled error a qualquer arquivo
 * que estivesse rodando naquele instante, derrubando uma suíte INTEIRA e
 * escolhendo a vítima ao acaso a cada execução. Era a causa da instabilidade
 * do `npm run test:e2e` completo (as suítes passavam isoladas).
 *
 * Mesma razão pela qual o ScraperModule fica fora do app de e2e
 * (`test/create-app.ts`): nada aqui precisa de fila para ser testado.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });
});
