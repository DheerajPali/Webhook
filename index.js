require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(cors({
  origin: "*", 
  methods: "*"
}));

// Create HTTP Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  methods: "*"
  }
});

// WebSocket Connection Handling
io.on("connection", (socket) => {
  console.log(`🔗 New client connected: ${socket.id}`);

  // Welcome message
  socket.emit("serverMessage", "Welcome! WebSocket is working.");

  // Handle test event
  socket.on("testEvent", (data) => {
    console.log("Received testEvent:", data);
    socket.emit("testResponse", "Message received!");
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Import Cosmos DB client
const container = require("./client");

// Fetch messages by contact number
app.get("/messages/:contact", async (req, res) => {
  const contact = req.params.contact;
  try {
    const { resources: messages } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.contact = @contact ORDER BY c.timestamp ASC",
        parameters: [{ name: "@contact", value: contact }]
      })
      .fetchAll();

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

// Webhook Verification (Meta/Facebook)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.TOKEN) {
    console.log("✅ Webhook Verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle Incoming WhatsApp Messages
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    // if (message) {
    //   const receivedMessage = {
    //     id: `${Date.now()}-${message.from}`,
    //     contact: message.from,
    //     from: message.from,
    //     to: "me",
    //     timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    //     text: message.text?.body || "",
    //     type: message.type,
    //     direction: "received"
    //   };

    //   await container.items.create(receivedMessage);
    //   console.log("📩 Received & Stored Message:", receivedMessage);

    //   // Broadcast to all connected clients
    //   io.emit("newMessage", receivedMessage);
    // }
    if (message) {
      const receivedMessage = {
        id: `${Date.now()}-${message.from}`,
        contact: message.from,
        from: message.from,
        to: "me",
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        text: message.text?.body || "",
        type: message.type,
        direction: "received"
      };
    
      await container.items.create(receivedMessage);
      console.log("📩 Received & Stored Message:", receivedMessage);
    
      // ✅ Emit event to notify all clients
      io.emit("newMessage", receivedMessage);
    }
    

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error processing webhook:", error.message);
    res.status(500).json({ success: false, error: "Webhook processing failed" });
  }
});

// Fetch All Messages
app.get("/messages", async (req, res) => {
  try {
    const { resources: messages } = await container.items.query("SELECT * FROM c").fetchAll();
    res.json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Send WhatsApp Message
app.post("/new-send-message", async (req, res) => {
  try {
    const { tempMessage } = req.body;
    console.log("📨 Sending Message:", tempMessage);

    const messageData = {
      messaging_product: "whatsapp",
      to: tempMessage.to,
      type: "text",
      text: { body: tempMessage.text.body }
    };

    const response = await axios.post(
      "https://graph.facebook.com/v22.0/580509908477893/messages",
      messageData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TOKEN}`
        }
      }
    );

    console.log("✅ Message Sent Successfully:", response.data);

    // Store Sent Message
    const sentMessage = {
      id: `${Date.now()}-${tempMessage.to}`,
      contact: tempMessage.to,
      from: tempMessage.from,
      to: tempMessage.to,
      timestamp: new Date().toISOString(),
      text: tempMessage.text.body,
      type: "text",
      direction: "sent"
    };

    await container.items.create(sentMessage);
    console.log("💾 Stored Sent Message:", sentMessage);

    // Broadcast sent message
    io.emit("newMessage", sentMessage);

    res.status(200).json({ success: true, message: sentMessage });
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

// Start Server
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
