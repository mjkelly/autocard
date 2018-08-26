# This Makefile is just to help you run common commands -- there's nothing
# fancy going on here.

.PHONY: docker-build docker-run build run clean lint

docker-build:
	docker build -t mjkelly/autocard:latest .

docker-run:
	docker run -t -i -p 8881:8881 mjkelly/autocard:latest

build:
	npm install

run:
	node ./server.js

clean:
	rm -rf node_modules

lint:
	xo
