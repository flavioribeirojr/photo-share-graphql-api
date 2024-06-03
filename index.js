require('dotenv').config();
const { createServer } = require('node:http');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const { createHandler } = require('graphql-http/lib/use/express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { MongoClient } = require('mongodb');
const { WebSocketServer } = require('ws');
const { PubSub } = require('graphql-subscriptions');
const { useServer } = require('graphql-ws/lib/use/ws');
const { resolvers } = require('./resolvers');
const path = require('path');

(async () => {
  const app = express();
  const httpServer = createServer(app);

  const dbClient = await MongoClient.connect(process.env.DB_HOST);
  const db = dbClient.db();

  const typeDefs = fs.readFileSync('./typeDefs.graphql', 'utf-8');
  const schema = makeExecutableSchema({typeDefs, resolvers});

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const pubsub = new PubSub();

  useServer({
    schema,
    onConnect: async context => {
      const githubToken = context.connectionParams.Authorization;
      const currentUser = await db.collection('users').findOne({ githubToken });

      context.extra.currentUser = currentUser;
      return true;
    },
    context: ({ extra  }) => {
      const currentUser = extra.currentUser;

      return { db, currentUser, pubsub };
    }
  },
    wsServer
  );

  app.all(
    '/graphql',
    express.json(),
    cors(),
    createHandler({
      schema,
      async parseRequestParams(req) {
        if (req.headers['content-type'] === 'application/json') {
          return req.body.query;
        }

        const processRequest = await import('graphql-upload/processRequest.mjs');
        const params = await processRequest.default(req.raw, req.context.res);

        if (Array.isArray(params)) {
          throw new Error('Batching is not supported');
        }

        return {
          ...params,
          variables: Object(params.variables),
        };
      },
      context: async (req) => {
        const githubToken = req.headers.authorization;
        const currentUser = await db.collection('users').findOne({ githubToken });

        return { db, currentUser, pubsub };
      }
    })
  );

  app.use(
    '/img/photos',
    express.static(path.join(__dirname, 'assets', 'photos'))
  );

  httpServer.listen(4000, () => {
    console.log(`GraphQL Server running @ http://localhost:4000/graphql`);
  });
})();