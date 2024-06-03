const fs = require('fs');
const path = require('path');

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

function uploadFile({ fileReadableStream, fileName }) {
  const photosDirectory = path.join(__dirname, 'assets', 'photos');
  const photosDirectoryExists = fs.existsSync(photosDirectory);

  if (!photosDirectoryExists) {
    fs.mkdirSync(photosDirectory, { recursive: true });
  }

  const writeStream = fs.createWriteStream(path.join(photosDirectory, fileName));
  fileReadableStream.pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

module.exports = {
  authorizeWithGithub,
  uploadFile,
}