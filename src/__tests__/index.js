import { loadFixtures, unloadFixtures } from 'util/fixtures';
import client from 'util/client';
import { apolloServer } from '../index';
import fixtures from '../__fixtures__/index';
import { createTestClient } from 'apollo-server-testing';

jest.mock('koa', () => {
  const Koa = jest.requireActual('koa');
  Koa.prototype.listen = () => null;
  return {
    default: Koa,
    __esModule: true,
  };
});

describe('apolloServer', () => {
  const actualGraphQLServerOptions = apolloServer.graphQLServerOptions;
  const mockGraphQLServerOptions = ctx => async () =>
    actualGraphQLServerOptions.call(apolloServer, { ctx });

  beforeAll(async () => {
    apolloServer.app;
    await loadFixtures(fixtures);
  });
  afterAll(async () => {
    await unloadFixtures(fixtures);
    await client.delete({
      index: 'users',
      type: 'doc',
      id: '6LOqD_gsUWLlGviSA4KFdKpsNncQfTYeueOl-DGx9fL6zCNeA',
    });
  });

  it('resolves current web user', async () => {
    const appId = 'WEBSITE';
    const userId = 'testUser1';

    apolloServer.graphQLServerOptions = mockGraphQLServerOptions({
      appId,
      userId,
      state: { user: { id: userId } },
      query: { userId },
    });

    const testClient = createTestClient(apolloServer);
    const {
      data: { GetUser: res },
      errors,
    } = await testClient.query({
      query: `{
        GetUser {
          id
          name
        }
      }`,
    });
    expect(errors).toBeUndefined();
    expect(res).toMatchObject({
      id: 'testUser1',
    });
  });

  it('resolves current backend user', async () => {
    const appId = 'TEST_BACKEND';
    const userId = 'testUser2';

    apolloServer.graphQLServerOptions = mockGraphQLServerOptions({
      appId,
      userId,
      state: {},
      query: { userId },
    });
    const testClient = createTestClient(apolloServer);
    const {
      data: { GetUser: res },
      errors,
    } = await testClient.query({
      query: `{
        GetUser {
          id
          name
        }
      }`,
    });
    expect(errors).toBeUndefined();
    expect(res).toMatchObject({
      id: '6LOqD_3gpe4ZVaxRvemf7KNTfm6y3WNBu1hbs-5MRdSWiWVss',
      name: 'test user 2',
    });
  });

  it('creates new backend user if not existed', async () => {
    const appId = 'TEST_BACKEND';
    const userId = 'testUser3';

    apolloServer.graphQLServerOptions = mockGraphQLServerOptions({
      appId,
      userId,
      state: {},
      query: { userId },
    });
    const testClient = createTestClient(apolloServer);
    const {
      data: { GetUser: res },
      errors,
    } = await testClient.query({
      query: `{
        GetUser {
          id
          name
        }
      }`,
    });
    expect(errors).toBeUndefined();
    expect(res).toMatchObject({
      id: '6LOqD_gsUWLlGviSA4KFdKpsNncQfTYeueOl-DGx9fL6zCNeA',
      name: expect.any(String),
    });
  });
});