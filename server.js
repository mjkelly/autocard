// This is a helper program that receives Github issue webhooks and puts
// newly-opened issues into the specified Github Project.
//
// See setup instructions in README.md.

const fs = require('fs');

const bodyParser = require('body-parser');
const express = require('express');
const request = require('request-promise-native');
const verifyGithubWebhook = require('verify-github-webhook');

function loadConfig(configFile) {
  let rawPrefs = fs.readFileSync(configFile);
  if (!rawPrefs) {
    throw new Error(`Could not read config file ${configFile}`);
  }
  let config = JSON.parse(rawPrefs);

  ['token', 'secret', 'debug', 'listenPort'].forEach(k => {
    if (config[k] === undefined) {
      throw new Error(`Key ${k} missing from ${configFile}`);
    }
  });
  console.log(`Loaded config from ${configFile}`);

  if (config.debug) {
    console.log('Debug mode on');
    console.log('Config:', config);
  }
  return config;
}

function mainHandler(req, res) {
  res.set('Content-type', 'text/plain');
  res.send('autocard\n');
}

function webhookHandler(req, res) {
  res.set('Content-type', 'text/plain');
  const signature = req.get('X-Hub-Signature');
  if (config.debug) {
    console.log('Signature:', signature);
  }

  try {
    if (!verifyGithubWebhook.default(signature, JSON.stringify(req.body), config.secret)) {
      console.log('Invalid signature');
      res.status(404).send('Invalid signature.\n');
      return;
    }
  } catch (err) {
    // Above, verifyGithubWebhook will throw various kinds of errors if the
    // signature isn't the right length, etc.
    console.log(err);
    res.status(404).send(`Error validating signature: ${signature}\n`);
    return;
  }

  if (req.body.action !== 'opened') {
    console.log(`Nothing to do for action=${req.body.action}`);
    res.send(`Nothing to do for action=${req.body.action}\n`);
    return;
  }
  if (!req.body.issue) {
    console.log('No "issue" parameter; nothing to do.');
    res.send('No "issue" parameter; nothing to do.\n');
    return;
  }

  const issueNum = parseInt(req.body.issue.number, 10);
  const issueID = parseInt(req.body.issue.id, 10);
  const columnID = parseInt(req.params.columnid, 10);

  if (config.debug) {
    console.log('columID:', columnID);
    console.log('POST body:', req.body);
  }
  console.log(`Issue ${issueNum} (${issueID}) in ${req.body.repository.full_name} opened`);
  const opts = {
    method: 'POST',
    uri: `https://${config.githubRoot}/projects/columns/${columnID}/cards`,
    headers: {
      'User-Agent': 'https://github.com/mjkelly/autocard',
      Authorization: 'token ' + config.token,
      Accept: 'application/vnd.github.v3+json; application/vnd.github.inertia-preview+json'
    },
    body: {
      content_type: 'Issue', /* eslint camelcase: "off" */
      content_id: issueID /* eslint camelcase: "off" */
    },
    json: true
  };
  if (config.debug) {
    console.log('Making request:', opts);
  }
  request(opts)
    .then(resp => {
      res.send(`OK. Got: ${JSON.stringify(resp)}`);
      console.log(`Successfully added issue ID ${issueID} to column ${columnID}`);
    }).catch(error => {
      res.status(500).send(`Error sending issue ${issueNum} to column ${columnID}\n`);
      console.log('Error:', error);
    });
}

function main() {
  const configFile = process.autocard_config_file || 'autocard.json';
  config = loadConfig(configFile);

  const app = express();
  app.use(bodyParser.json());

  app.all('/', mainHandler);

  app.post('/autocard-webhook/:columnid', webhookHandler);

  console.log('Listening on port', config.listenPort);
  app.listen(config.listenPort);
}

main();
