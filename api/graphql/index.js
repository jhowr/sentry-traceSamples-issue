const { ApolloServer } = require('apollo-server-micro')
const cors = require('micro-cors')

const sentryPlugin = require('../../plugins/sentry.js')

const typeDefs = `#graphql
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
  }
`;

const books = [
  {
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    title: 'City of Glass',
    author: 'Paul Auster',
  },
];

const resolvers = {
  Query: {
    books: () => books,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [sentryPlugin],
  introspection: true,
  playground: false
});

const handler = server.createHandler({
  disableHealthCheck: true,
})

module.exports = cors({
  allowHeaders: [
    'Accept',
    'Access-Control-Allow-Origin',
    'ApolloGraphQL-Client-Name',
    'ApolloGraphQL-Client-Version',
    'Authorization',
    'Baggage',
    'Content-Type',
    'Sentry-Trace',
    'X-Requested-With',
    'X-HTTP-Method-Override'
  ]
})(sentryPlugin.client.handler(async (req, res) => {

  if (req.method === 'OPTIONS') return res.end()

  try {
    await handler(req, res)
  } catch (err) {
    console.log(err)
    // sentry.client.capture(err)
    res.end()
  }
}))