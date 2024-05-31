const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { createServer } = require('http');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
require('dotenv').config();
const { resolvers } = require('./resolvers');
const { PubSub } = require('graphql-subscriptions');
const typeDefs = fs.readFileSync('./typeDefs.graphql', 'utf-8');

(async () => {
  const app = express();
  const httpServer = createServer(app);

  const dbClient = await MongoClient.connect(process.env.DB_HOST);
  const db = dbClient.db();
  const pubsub = new PubSub();

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const wsServer = new WebSocketServer({
    // This is the `httpServer` we created in a previous step.
    server: httpServer,
    // Pass a different path here if app.use
    // serves expressMiddleware at a different path
    path: '/graphql',
  });
  
  // Hand in the schema we just created and have the
  // WebSocketServer start listening.
  const serverCleanup = useServer({
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

  const server = new ApolloServer({
    schema,

    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ]
  });
  await server.start();

  app.use('/graphql', cors(), express.json(), expressMiddleware(server, {
    context: async ({ req }) => {
      const githubToken = req.headers.authorization;
      const currentUser = await db.collection('users').findOne({ githubToken });

      return { db, currentUser, pubsub };
    }
  }));

  httpServer.listen(4000, () => {
    console.log(`GraphQL Server running @ http://localhost:4000/graphql`);
  });
})();