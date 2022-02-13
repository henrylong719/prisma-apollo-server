require('dotenv').config();
import { ApolloServer } from 'apollo-server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

import { LaunchAPI } from './datasources/launch';
import { UserAPI } from './datasources/user';
import { PrismaClient } from '.prisma/client';
import IsEmail from 'isemail';

const prisma = new PrismaClient();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    launchAPI: new LaunchAPI(),
    userAPI: new UserAPI({ prisma }),
  }),
  context: async ({ req }) => {
    // simple auth check on every request
    const auth = (req.headers && req.headers.authorization) || '';
    const email = Buffer.from(auth, 'base64').toString('ascii');
    if (!IsEmail.validate) return { user: null };
    const user = await prisma.user.findUnique({
      where: { email },
      include: { trips: true },
    });
    return { user, prisma };
  },
});

server.listen().then(() => {
  console.log(`
    Server is running!
    Listening on port http://localhost:4000
    Explore at https://studio.apollographql.com/dev
  `);
});
