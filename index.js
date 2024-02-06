const { ApolloServer } = require('apollo-server-express');
const { MongoClient } = require('mongodb');
const express = require('express');
const expressPlayground = require('graphql-playground-middleware-express');
const fs = require('fs');
require('dotenv').config();
const { resolvers } = require('./resolvers');
const typeDefs = fs.readFileSync('./typeDefs.graphql', 'utf-8');

(async () => {
  const app = express();

  const dbClient = await MongoClient.connect(process.env.DB_HOST);
  const db = dbClient.db();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const githubToken = req.headers.authorization;
      const currentUser = await db.collection('users').findOne({ githubToken });

      return { db, currentUser };
    }
  });
  await server.start();

  server.applyMiddleware({ app });

  app.get('/', (req, res) => res.end('Welcome to PhotoShare API'));
  app.get('/playground', expressPlayground.default({ endpoint: '/graphql' }));

  app.listen({ port: 4000 }, () => {
    console.log(`GraphQL Server running @ http://localhost:4000${server.graphqlPath}`);
  });
})();