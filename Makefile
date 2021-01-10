package:
	yarn build:server
	zip -r server.zip dist/src dist/server package.json

clean:
	rm -rf node_modules dist