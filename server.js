// This is a helper program that receives Github issue webhooks and puts
// newly-opened issues into the specified Github Project.
//
// See setup instructions in README.md.

const fs = require('fs');

const bodyParser = require('body-parser');
const express = require('express');
const request = require('request-promise-native');
const verifyGithubWebhook = require('verify-github-webhook');

const prefsFile = process.issue_to_project_prefs_file || 'autocard.json';

const app = express();
app.use(bodyParser.json());

const rawPrefs = fs.readFileSync(prefsFile);
if (!rawPrefs) {
  throw new Error('Could not read preferences file ' + prefsFile);
}
const prefs = JSON.parse(rawPrefs);

if (prefs.debug) {
  console.log('Debug mode on');
  console.log('Preferences file:', prefsFile);
  console.log('Preferences:', prefs);
}

// Handlers

app.get('/autocard-webhook', (req, res) => {
  res.set('Content-type', 'text/plain');
  // This is just for checking your load balancer or reverse proxy (which
  // you're using to add SSL termination, right?) is working.
  res.send('This is autocard. Send a POST request\n');
});

app.post('/autocard-webhook', (req, res) => {
  res.set('Content-type', 'text/plain');
  const signature = req.get('X-Hub-Signature');
  if (prefs.debug) {
    console.log('POST body:', req.body);
    console.log('Signature:', signature);
  }

  try {
    if (!verifyGithubWebhook.default(signature, JSON.stringify(req.body), prefs.secret)) {
      console.log('Invalid signature:', signature);
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
    res.send(`Nothing to do for action=${req.body.action}`);
    console.log(`Nothing to do for action=${req.body.action}\n`);
    return;
  }
  if (!req.body.issue) {
    console.log('No "issue" parameter; nothing to do.');
    res.send('No "issue" parameter; nothing to do.\n');
    return;
  }

  const issueNum = parseInt(req.body.issue.number, 10);
  const issueID = parseInt(req.body.issue.id, 10);
  console.log(`Issue ${issueNum} (${issueID}) in ${req.body.repository.full_name} opened`);
  const opts = {
    method: 'POST',
    uri: `https://api.github.com/projects/columns/${prefs.columnID}/cards`,
    headers: {
      'User-Agent': 'request-promise-native github-webhook.js',
      Authorization: 'token ' + prefs.token,
      Accept: 'application/vnd.github.v3+json; application/vnd.github.inertia-preview+json'
    },
    body: {
      content_type: 'Issue', /* eslint camelcase: "off" */
      content_id: issueID /* eslint camelcase: "off" */
    },
    json: true
  };
  if (prefs.debug) {
    console.log('Making request:', opts);
  }
  request(opts)
    .then(resp => {
      res.send(`OK. Got: ${JSON.stringify(resp)}`);
    }).catch(error => {
      res.status(500).send(`Error sending issue ${issueNum} to column ${prefs.columnID}\n`);
      console.log('Error:', error);
    });
});

// End of handlers

console.log('Listening on port', prefs.serverPort);
app.listen(prefs.serverPort);
