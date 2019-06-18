import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as WebSocket from "ws";

const port = 3000;
const staticPath = "../public/static";

const server = http.createServer((req, res) => {
  let filePath = staticPath + req.url;
  if (filePath === `${staticPath}/` || filePath === ".") {
    filePath += "index.html";
  }

  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath);
  let contentType = "text/html";
  switch (extname) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".css":
      contentType = "text/css";
      break;
    case ".json":
      contentType = "application/json";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".jpg":
      contentType = "image/jpg";
      break;
    case ".wav":
      contentType = "audio/wav";
      break;
  }

  fs.readFile(filePath, function(error, content) {
    if (error) {
      if (error.code == "ENOENT") {
        fs.readFile("./404.html", function(error, content) {
          res.writeHead(200, {
            "Content-Type": contentType
          });
          res.end(content, "utf-8");
        });
      } else {
        res.writeHead(500);
        res.end(
          "Sorry, check with the site admin for error: " + error.code + " ..\n"
        );
        res.end();
      }
    } else {
      res.writeHead(200, {
        "Content-Type": contentType
      });
      res.end(content, "utf-8");
    }
  });
});

server.listen(port, () => console.log(`Server running on port:${port}`));

const wss = new WebSocket.Server({
  server
});

// make this a model later (use a DB or something else)
const players = new Set();

wss.on("connection", ws => {
  console.log("Connection");
  ws.on("message", message => {
    try {
      const data = JSON.parse(String(message)) as ISocketMessage;
      console.log(data);
      if (data.type === "keys") {
        const payload = data.payload as KeyPressMessage;
        // send to EVERYONE
        wss.clients.forEach(client => {
          if (client === ws) return;

          client.send(message);
        });
      }
    } catch {
      console.log("Invalid JSON");
    }
  });

  const uid = `${Math.random()}${Math.random()}`;

  ws.on("close", () => {
    console.log("leave");
    players.delete(uid);
  });

  ws.send(
    JSON.stringify({
      type: "welcome",
      payload: {
        uid,
        players: Array.from(players)
      }
    })
  );

  players.add(uid);

  // tell EVERYONE about the new guy! (make rooms later)
  wss.clients.forEach(client => {
    if (client === ws) return;

    const message: ISocketMessage = {
      type: "new-player",
      payload: {
        uid
      }
    };
    client.send(JSON.stringify(message));
  });
});
