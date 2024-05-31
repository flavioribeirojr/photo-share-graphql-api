const Subscription = {
  newPhoto: {
    subscribe: (parent, args, { pubsub }) =>
      pubsub.asyncIterator('photo-added')
  },
  newUser: {
    subscribe: (parent, args, { pubsub }) =>
      pubsub.asyncIterator('user-created')
  }
};

module.exports = {
  Subscription
};