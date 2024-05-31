const { GraphQLScalarType } = require('graphql');
const { Query } = require('./Query');
const { Mutation } = require('./Mutation');
const { Subscription } = require('./Subscription');

const resolvers = {
  Query,
  Mutation,
  Subscription,
  Photo: {
    id: parent => parent.id || parent._id,
    url: parent => `/img/photos/${parent._id}.jpg`,
    postedBy: (parent, args, { db }) =>
      db.collection('users').findOne({ githubLogin: parent.userID }),
    async taggedUsers (parent, args, { db }) {
      const tags = await db.collection('photo_tags').find({ photoID: parent._id }).toArray();
      const userIds = tags.map(tag => tag.userID);

      const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
      return users;
    }
  },
  User: {
    postedPhotos: (parent, args, { db }) =>
      db.collection('photos').find({ userID: parent.githubLogin }).toArray(),
    async inPhotos (parent, args, { db }) {
      const tags = await db.collection('photo_tags').find({ userID: parent._id }).toArray();
      const photoIDS = tags.map(tag => tag.photoID);

      const photos = await db.collection('photos').find({ _id: { $in: photoIDS } }).toArray();
      return photos;
    }
  },
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'A valid date time value.',
    parseValue: value => new Date(value),
    serialize: value => new Date(value).toISOString(),
    parseLiteral: ast => ast.value,
  })
}

module.exports = {
  resolvers
}