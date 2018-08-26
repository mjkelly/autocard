# autocard

Automatically add new Github issues to projects as cards

This is a helper program that receives Github issue webhooks and puts
newly-opened issues into the specified Github Project.

This is probably useful to you if you're migrating to Github Projects from
Zenhub, because it allows you to more closely mimic a Zenhub workflow with
Github Projects.

Github Projects (https://help.github.com/articles/about-project-boards/)
provide some automation for placing closed, and re-opened issue cards in
specific columns, but initially creating a card (which is a project-specific
entity) from an issue (with is a repo-specific entity) remains a manual
operation. This tool automates that.

This tool does *not* sync all issues to the target project -- so it doesn't
handle backfilling cards, or catching up after you missing webhooks.

## Caveats

This project is written in Node, and I used it as a way to help learn Node.
Don't look at the code as a good example; assume I'm doing everything wrong.

## Setup 

We assume you already have a github repo with issues, and a project you want to
send new issues to.

1. Generate a new github API key:
    - In Github's web interface, click:
      Settings -> Developer settings -> Personal access tokens
    - It needs "repo" scope.
2. Determine column ID for new issues:
    - In Github's web interface, view your project and pick which column you
      want new issues to be added to. Click the 3 dots -> "Copy column URL".
    - You'll get a URL like this:
      https://github.com/mjkelly/projects-test/projects/1#column-3284701
      That number in #column-<id> is the column ID.
3. Set up a webhook on your repo to talk to this service.
    - The webhook should POST to `/autocard-webhook/<id>`
      where `<id>` is the column ID you determined in step 2.
    - Set content type to `application/json`.
    - Set the webhook to trigger only on "Issues" events.
    - Set a secret on the webhook. This is any string; it's a shared secret
      between github and this server, so this server knows webhooks are
      authentic.
4. Put all that info in autocard.json! See
   autocard.json.example for the format.

It's up to you to decide how to expose this server. (You really should run
it behind a reverse proxy or a load balancer that adds SSL termination.)

## Docker

There's a Dockerfile included. The easiest way to use it is to use the
Makefile, by typing `make docker-build`.

Which will create a new image, `mjkelly/autocard:latest`. Now you can run that
image with `make docker-run`.
