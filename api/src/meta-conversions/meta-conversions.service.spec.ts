import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetaConversionsService } from './meta-conversions.service';
import { hashEmail, hashName, hashPhone, sha256 } from './hash.helper';

describe('MetaConversionsService', () => {
  let originalFetch: typeof fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ events_received: 1, fbtrace_id: 'fb-trace-x' }),
      text: async () => '{}',
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function makeService(env: Record<string, string | undefined>) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MetaConversionsService,
        {
          provide: ConfigService,
          useValue: { get: <T>(key: string): T | undefined => env[key] as T | undefined },
        },
      ],
    }).compile();
    return moduleRef.get(MetaConversionsService);
  }

  it('é no-op quando META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN ausente', async () => {
    const service = await makeService({ META_PIXEL_ID: '', META_CAPI_ACCESS_TOKEN: '' });
    expect(service.isConfigured()).toBe(false);
    await service.sendLeadEvent({ eventId: 'uuid', email: 'x@x.com' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda payload com hashes em em/ph/fn/external_id', async () => {
    const service = await makeService({
      META_PIXEL_ID: '123',
      META_CAPI_ACCESS_TOKEN: 'tok',
    });

    await service.sendLeadEvent({
      eventId: 'evt-1',
      eventTime: 1700000000,
      email: 'Fulana@Example.com',
      phone: '+55 (11) 9 9999-9999',
      firstName: 'Fulana',
      externalId: 'lead-1',
      fbp: 'fb.1.123.456',
      fbc: 'fb.1.fbclid',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      eventSourceUrl: 'https://maximizeenfermagem.com.br/diagnostico',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v18.0/123/events');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');

    const body = JSON.parse(init.body);
    expect(body.data).toHaveLength(1);
    const event = body.data[0];
    expect(event.event_name).toBe('Lead');
    expect(event.event_id).toBe('evt-1');
    expect(event.event_time).toBe(1700000000);
    expect(event.action_source).toBe('website');
    expect(event.event_source_url).toBe(
      'https://maximizeenfermagem.com.br/diagnostico',
    );
    expect(event.custom_data).toEqual({ content_name: 'Diagnostico Edital' });

    expect(event.user_data.em).toEqual([hashEmail('Fulana@Example.com')]);
    expect(event.user_data.ph).toEqual([hashPhone('+55 (11) 9 9999-9999')]);
    expect(event.user_data.fn).toEqual([hashName('Fulana')]);
    expect(event.user_data.external_id).toEqual([sha256('lead-1')]);
    expect(event.user_data.fbp).toBe('fb.1.123.456');
    expect(event.user_data.fbc).toBe('fb.1.fbclid');
    expect(event.user_data.client_ip_address).toBe('127.0.0.1');
    expect(event.user_data.client_user_agent).toBe('jest');
  });

  it('inclui test_event_code quando configurado', async () => {
    const service = await makeService({
      META_PIXEL_ID: '123',
      META_CAPI_ACCESS_TOKEN: 'tok',
      META_TEST_EVENT_CODE: 'TEST12345',
    });

    await service.sendLeadEvent({ eventId: 'evt', email: 'x@x.com' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.test_event_code).toBe('TEST12345');
  });

  it('omite test_event_code quando não configurado', async () => {
    const service = await makeService({
      META_PIXEL_ID: '123',
      META_CAPI_ACCESS_TOKEN: 'tok',
    });

    await service.sendLeadEvent({ eventId: 'evt', email: 'x@x.com' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.test_event_code).toBeUndefined();
  });

  it('respeita META_GRAPH_API_VERSION quando setado', async () => {
    const service = await makeService({
      META_PIXEL_ID: '123',
      META_CAPI_ACCESS_TOKEN: 'tok',
      META_GRAPH_API_VERSION: 'v22.0',
    });

    await service.sendLeadEvent({ eventId: 'evt', email: 'x@x.com' });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://graph.facebook.com/v22.0/123/events',
    );
  });

  it('falha de rede não propaga (best-effort)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const service = await makeService({
      META_PIXEL_ID: '123',
      META_CAPI_ACCESS_TOKEN: 'tok',
    });

    await expect(
      service.sendLeadEvent({ eventId: 'evt', email: 'x@x.com' }),
    ).resolves.toBeUndefined();
  });

  it('resposta 4xx do Meta não propaga', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"bad token"}}',
      json: async () => ({}),
    });
    const service = await makeService({
      META_PIXEL_ID: '123',
      META_CAPI_ACCESS_TOKEN: 'tok',
    });

    await expect(
      service.sendLeadEvent({ eventId: 'evt', email: 'x@x.com' }),
    ).resolves.toBeUndefined();
  });
});
