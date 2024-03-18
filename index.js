const express = require("express");
const path = require("path");
const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const app = express();

AWS.config.update({
  region: "us-east-1",
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.text());

const clients = [];

app.post("/updates", (req, res) => {
  let payload;

  try {
    payload = JSON.parse(req.body);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return res.status(400).send("Invalid JSON");
  }

  console.log(payload);

  if (req.headers["x-amz-sns-message-type"] === "SubscriptionConfirmation") {
    const url = payload.SubscribeURL;
    fetch(url)
      .then((response) => {
        if (response.ok) {
          console.log("Subscription confirmed!");
        } else {
          console.error("Error confirming subscription");
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });
  } else if (req.headers["x-amz-sns-message-type"] === "Notification") {
    clients.forEach((client) =>
      client.write(`data: ${JSON.stringify(payload.Message)}\n\n`)
    );
  }
  res.status(200).end();
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${"Connected!"}\n\n`);
  clients.push(res);

  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
  });
});

app.listen(80, () => {
  console.log("Server running on port 80");
});
