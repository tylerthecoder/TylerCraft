package:
	yarn build:server
	zip -r server.zip dist/src dist/server package.json

clean:
	rm -rf node_modules dist



deploy-pi:
# Move to root directory
	cd "$(dirname "$0")"
# Copy all project files to pi
	rsync -av . \
	--exclude ".vscode" \
	--exclude ".next" \
	--exclude ".vercel" \
	--exclude ".git" \
	--exclude "node_modules" \
	 pi@10.0.0.7:~/dev/craft/
# Run Deploy Command
	ssh pi@10.0.0.7 "sudo -u pi ~/owl/home-pi/start-eco.sh"