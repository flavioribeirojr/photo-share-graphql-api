const { authorizeWithGithub } = require("../lib")

module.exports = {
  Mutation: {
    async postPhoto(parent, args, { db, currentUser }) {
      if (!currentUser) {
        throw new Error('only an authorized user can post a photo');
      }

      const newPhoto = {
        ...args.input,
        userID: currentUser.githubLogin,
        created: new Date()
      };

      const { insertedId } = await db.collection('photos').insertOne(newPhoto);
      newPhoto.id = insertedId;

      return newPhoto;
    },
    async githubAuth(parent, { code }, { db }) {
      const { GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_SECRET_ID } = process.env;

      const {
        message,
        access_token,
        avatar_url,
        login,
        name,
      } = await authorizeWithGithub({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        client_secret: GITHUB_OAUTH_SECRET_ID,
        code,
      });

      if (message) {
        throw new Error(message);
      }

      const latestUserInfo = {
        name,
        githubLogin: login,
        githubToken: access_token,
        avatar: avatar_url,
      };

      await db
        .collection('users')
        .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true });

      return { user: latestUserInfo, token: access_token };
    },
    async addFakeUsers(parent, { count }, { db }) {
      const randomUserApi = `https://randomuser.me/api?results=${count}`;
      const { results } = await fetch(randomUserApi).then(res => res.json());

      const users = results.map(r => ({
        githubLogin: r.login.username,
        name: `${r.name.first} ${r.name.last}`,
        avatar: r.picture.thumbnail,
        githubToken: r.login.sha1
      }));

      await db.collection('users').insertMany(users);

      return users;
    },
    async fakeUserAuth(parent, { githubLogin }, { db }) {
      const user = await db.collection('users').findOne({ githubLogin });

      if (!user) {
        throw new Error(`Cannot find user with githubLogin "${githubLogin}"`);
      }

      return {
        token: user.githubToken,
        user,
      };
    }
  },
}