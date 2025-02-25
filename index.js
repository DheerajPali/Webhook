require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

let messages = [];

// Verification endpoint
app.get("/webhook", (req, res) => {
  const verificationToken = process.env.TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verification_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === verificationToken) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle incoming messages
app.post("/webhook", (req, res) => {
  const body = req.body;
  if (body.object) {
    const message = body.entry[0]?.changes[0]?.value?.messages?.[0];
    if (message) {
      console.log("Received Message: ", message);
      messages.push(message); // Store message
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Endpoint for frontend to fetch messages
app.get("/messages", (req, res) => {
  console.log("fetched messages endpoint");
  res.status(200).json(messages);
});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
