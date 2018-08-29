// This is a helper program that receives Github issue webhooks and puts
// newly-opened issues into the specified Github Project.
//
// See setup instructions in README.md.

const fs = require('fs');

const bodyParser = require('body-parser');
const express = require('express');
const request = require('request-promise-native');
const verifyGithubWebhook = require('verify-github-webhook');

const info = require('debug')('autocard:info');
const debug = require('debug')('autocard:debug');

class Autocard {
  constructor() {
    this.config = null;

    this.app = express();
    this.app.use(bodyParser.json());
    this.app.all('/', (req, res) => {
      this.mainHandler(req, res);
    });
    this.app.post('/autocard-webhook/:columnid', (req, res) => {
      this.webhookHandler(req, res);
    });
  }

  run() {
    if (this.config === null) {
      throw new Error('You must call loadConfig() before run()');
    }
    info('Listening on port', this.config.listenPort);
    this.app.listen(this.config.listenPort);
  }

  loadConfig() {
    const configFile = process.autocard_config_file || 'autocard.json';
    const rawPrefs = fs.readFileSync(configFile);
    if (!rawPrefs) {
      throw new Error(`Could not read config file ${configFile}`);
    }
    const config = JSON.parse(rawPrefs);

    ['token', 'secret', 'listenPort', 'githubRoot'].forEach(k => {
      if (config[k] === undefined) {
        throw new Error(`Key ${k} missing from ${configFile}`);
      }
    });
    info(`Loaded config from ${configFile}`);

    this.config = config;
    // As of now, we can call debug();
    debug('Debug mode on');
    debug('Config:', this.config);
  }

  mainHandler(req, res) {
    res.set('Content-type', 'text/plain');
    res.send('autocard\n');
  }

  webhookHandler(req, res) {
    res.set('Content-type', 'text/plain');
    const signature = req.get('X-Hub-Signature');
    debug('Signature:', signature);

    try {
      if (!verifyGithubWebhook.default(signature, JSON.stringify(req.body), this.config.secret)) {
        info('Invalid signature');
        res.status(404).send('Invalid signature.\n');
        return;
      }
    } catch (err) {
      // Above, verifyGithubWebhook will throw various kinds of errors if the
      // signature isn't the right length, etc.
      info(err);
      res.status(404).send(`Error validating signature: ${signature}\n`);
      return;
    }

    if (req.body.action !== 'opened') {
      info(`Nothing to do for action=${req.body.action}`);
      res.send(`Nothing to do for action=${req.body.action}\n`);
      return;
    }
    if (!req.body.issue) {
      info('No "issue" parameter; nothing to do.');
      res.send('No "issue" parameter; nothing to do.\n');
      return;
    }

    const issueNum = parseInt(req.body.issue.number, 10);
    const issueID = parseInt(req.body.issue.id, 10);
    const columnID = parseInt(req.params.columnid, 10);

    debug('columID:', columnID);
    debug('POST body:', req.body);
    info(`Issue ${issueNum} (${issueID}) in ${req.body.repository.full_name} opened`);
    const opts = {
      method: 'POST',
      uri: `https://${this.config.githubRoot}/projects/columns/${columnID}/cards`,
      headers: {
        'User-Agent': 'https://github.com/mjkelly/autocard',
        Authorization: 'token ' + this.config.token,
        Accept: 'application/vnd.github.v3+json; application/vnd.github.inertia-preview+json'
      },
      body: {
        content_type: 'Issue', /* eslint camelcase: "off" */
        content_id: issueID /* eslint camelcase: "off" */
      },
      json: true
    };
    debug('Making request:', opts);
    request(opts)
      .then(resp => {
        res.send(`OK. Got: ${JSON.stringify(resp)}`);
        info(`Successfully added issue ID ${issueID} to column ${columnID}`);
      }).catch(error => {
        res.status(500).send(`Error sending issue ${issueNum} to column ${columnID}\n`);
        info('Error:', error);
      });
  }
}

const ac = new Autocard();
ac.loadConfig();
ac.run();
