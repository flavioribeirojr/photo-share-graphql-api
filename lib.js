async function requestGithubToken(credentials) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  return response.json();
}

async function requestGithubUserAccount(token) {
  const headers = new Headers();
  headers.append('Authorization', `token ${token}`);

  const response = await fetch(`https://api.github.com/user`, {
    headers
  });
  return response.json();
}

async function authorizeWithGithub(credentials) {
  const { access_token } = await requestGithubToken(credentials);
  const githubUser = await requestGithubUserAccount(access_token);

  return {
    ...githubUser,
    access_token
  };
}

module.exports = {
  authorizeWithGithub
}