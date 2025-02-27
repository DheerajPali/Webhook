require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(cors());

//for socket
const http = require("http"); // Added for socket.io
const { Server } = require("socket.io"); // Added for socket.io

const server = http.createServer(app); // Create server for socket.io
const io = new Server(server, {
  cors: { origin: "*" }, // Allow all origins for testing
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
});

let messages = [];

//Updated Endpoint to fetch messages by contact number
app.get("/messages/:contact", async (req, res) => {
  const contact = req.params.contact;
  try {
    const { resources: messages } = await container.items
      .query({
        query:
          "SELECT * FROM c WHERE c.contact = @contact ORDER BY c.timestamp ASC",
        parameters: [{ name: "@contact", value: contact }],
      })
      .fetchAll();

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

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

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message) {
      const contact = message.from; // Extracting 'from' field for contact
      const receivedMessage = {
        id: `${Date.now()}-${contact}`,
        contact,
        from: contact,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), // Converting timestamp
        text: message.text?.body || "", // Extracting text body
        type: message.type,
        direction: "received",
      };

      await container.items.create(receivedMessage); // Store received message
      console.log("Received Message Stored:", receivedMessage);
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/messages", async (req, res) => {
  try {
    const { resources: messages } = await container.items
      .query("SELECT * FROM c")
      .fetchAll();
    // console.log(messages);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send("Internal Server Error");
  }
});

const container = require("./client");

app.post("/new-send-message", async (req, res) => {
  console.log("req", req.body);

  body = req.body;
  const schema = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: body.tempMessage.id,
        changes: [
          {
            value: {
              messages: [
                {
                  from: body.tempMessage.from,
                  id: body.tempMessage.id,
                  // timestamp: body.tempMessage.timestamp,
                  timestamp: Math.floor(Date.now() / 1000),
                  text: {
                    body: body.tempMessage.text.body,
                  },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  console.log("inside new send message");

  if (schema.object === "whatsapp_business_account") {
    const entry = schema.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    // const { text,contact } = req.body;
    // console.log("inside send-message");
    try {
      const response = await axios.post(
        "https://graph.facebook.com/v22.0/580509908477893/messages",
        {
          messaging_product: "whatsapp",
          to: process.env.TO,
          type: "text",
          text: { body: message.text?.body },
        },

        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.TOKEN}`, // Use env variable for token
          },
        }
      );
      if (message) {
        const contact = message.from; // Extracting 'from' field for contact
        const sentMessage = {
          id: `${Date.now()}-${contact}`,
          contact,
          from: contact,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), // Converting timestamp
          text: message.text?.body || "", // Extracting text body
          type: message.type,
          direction: "sent",
        };
        await container.items.create(sentMessage); // Store received messag
        console.log("Sent Message: ", sentMessage);
        res.status(200).json({ success: true, message: sentMessage });
      }
    } catch (error) {
      console.error(
        "Error sending message:",
        error.response?.data || error.message
      );
      res.status(500).json({ success: false, error: "Failed to send message" });
    }
  } else {
    res.sendStatus(400, "please check api route");
  }
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
