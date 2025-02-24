const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

//Basic root endpoint
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Verification endpoint
app.get("/webhook", (req, res) => {
  const verificationToken = "your_verification_token";
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

// To receive messages
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object) {
    const message = body.entry[0]?.changes[0]?.value?.messages?.[0];
    if (message) {
      console.log("Received Message: ", message);
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ✅ Single app.listen() here
app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
