import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';

export interface GraphqlResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

export async function postGraphql<T = unknown>(
  app: INestApplication,
  query: string,
  variables?: Record<string, unknown>,
  bearerToken?: string,
): Promise<{ status: number; body: GraphqlResponse<T> }> {
  const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  let req = request(httpServer).post('/graphql').send({ query, variables });

  if (bearerToken) {
    req = req.set('Authorization', `Bearer ${bearerToken}`);
  }

  const response: Response = await req;
  return {
    status: response.status,
    body: response.body as GraphqlResponse<T>,
  };
}

export function expectGraphqlErrors(
  body: GraphqlResponse,
  messageIncludes?: string,
): void {
  expect(body.errors).toBeDefined();
  expect(body.errors?.length).toBeGreaterThan(0);
  if (messageIncludes) {
    const messages = body.errors?.map((error) => error.message).join(' ') ?? '';
    expect(messages.toLowerCase()).toContain(messageIncludes.toLowerCase());
  }
}

export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@e2e.pethealth.test`;
}
