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
// app.get("/webhook", (req, res) => {
//   const verificationToken = process.env.TOKEN;
//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verification_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && token === verificationToken) {
//     console.log("Webhook verified!");
//     res.status(200).send(challenge);
//   } else {
//     res.sendStatus(403);
//   }
// });

// Updated Handle incoming messages
// app.post("/webhook", async (req, res) => {
//   const body = req.body;
//   if (body.object) {
//     const message = body.entry[0]?.changes[0]?.value?.messages?.[0];
//     const contact = message?.from; // Extracting 'from' field for contact

//     if (message) {
//       const receivedMessage = {
//         id: `${Date.now()}-${contact}`,
//         contact,
//         from: contact,
//         timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), // Converting timestamp
//         text: message.text.body, // Extracting text body
//         type: message.type,
//         direction: "received",
//       };

//       await container.items.create(receivedMessage); // Store received message
//       console.log("Received Message Stored:", receivedMessage);
//     }
//     res.sendStatus(200);
//   } else {
//     res.sendStatus(404);
//   }
// });

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

// Handle incoming messages
app.post("/webhook1", (req, res) => {
  const body = req.body;
  if (body.object) {
    const message = body.entry[0]?.changes[0]?.value?.messages?.[0];
    if (message) {
      console.log("Received Message: ", message);
      messages.push({ ...message, direction: "received" }); // Store received message with direction
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Endpoint for frontend to fetch messages
// app.get("/messages", (req, res) => {
//   console.log("Fetched messages endpoint");
//   res.status(200).json(messages);
// });
// app.get("/messages", (req, res) => {
//   res.json([
//     { text: { body: "Hello from local!" }, direction: "received" },
//   ]);
// });
// app.get("/messages", async (req, res) => {
//   try {
//     const { resources: messages } = await container.items.query("SELECT * FROM c").fetchAll();
//     res.json(messages);
//   } catch (error) {
//     console.error("Error fetching messages from Cosmos DB:", error);
//     res.status(500).json({ error: "Failed to fetch messages" });
//   }
// });

app.get("/messages", async (req, res) => {
  try {
    const { resources: messages } = await container.items
      .query("SELECT * FROM c")
      .fetchAll();
    console.log(messages);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send("Internal Server Error");
  }
});

const container = require("./client");

app.post("/send-message2", (req, res) => {
  try {
    console.log("coming");
    // const response = await axios.post(
    //   "https://graph.facebook.com/v22.0/580509908477893/messages",
    //   {
    //     messaging_product: "whatsapp",
    //     to: contact,
    //     type: "text",
    //     text: { body: text },
    //   },
    //   {
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${process.env.TOKEN}`,
    //     },
    //   }
    // );

    const body = req.body;
    if (body.object) {
      const message = body.entry[0]?.changes[0]?.value?.messages?.[0];
      if (message) {
        console.log("Received Message: ", message);
        messages.push({ ...message, direction: "received" }); // Store received message with direction
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
  }
});

// Updated send-message endpoint
app.post("/send-message1", async (req, res) => {
  // const { text, contact } = req.body;
  console.log("inside send-message");

  try {
    // const response = await axios.post(
    //   "https://graph.facebook.com/v22.0/580509908477893/messages",
    //   {
    //     messaging_product: "whatsapp",
    //     to: contact,
    //     type: "text",
    //     text: { body: text },
    //   },
    //   {
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${process.env.TOKEN}`,
    //     },
    //   }
    // );

    const body = req.body;
    if (body.object) {
      const message = body.entry[0]?.changes[0]?.value?.messages?.[0];
      if (message) {
        console.log("Received Message: ", message);
        messages.push({ ...message, direction: "received" }); // Store received message with direction
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }

    // const sentMessage = {
    //   id: `${Date.now()}-${contact}`, // Unique ID
    //   contact,
    //   from: contact,
    //   timestamp: new Date().toISOString(),
    //   text: { body: text },
    //   type: "text",
    //   direction: "sent",
    // };

    await container.items.create(message); // Store in Cosmos DB
    // await container.items.create(sentMessage); // Store in Cosmos DB
    console.log("Sent Message Stored:", message);
    res.status(200).json({ success: true, message: message });
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

app.post("/send-message", async (req, res) => {
  const { text, contact } = req.body;
  console.log("inside send-message");
  try {
    // const response = await axios.post(
    //   "https://graph.facebook.com/v22.0/580509908477893/messages",
    //   {
    //     messaging_product: "whatsapp",
    //     to : contact,
    //     type: "text",
    //     text: { body: text }
    //   },

    //   {
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${process.env.TOKEN}` // Use env variable for token
    //     }
    //   }
    // );

    const sentMessage = {
      from: "me",
      to: contact,
      timestamp: new Date().toISOString(),
      text: { body: text },
      type: "text",
      direction: "sent",
    };

    messages.push(sentMessage); // Store sent message
    console.log("Sent Message: ", sentMessage);
    res.status(200).json({ success: true, message: sentMessage });
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

app.post("/new-send-message", async (req, res) => {
  console.log("req",req.body);

  // req {
  //   tempMessage: {
  //     id: 'temp-1740641162077',
  //     contact: '917458123456',
  //     from: 'me',
  //     to: '917458123456',
  //     timestamp: '2025-02-27T07:26:02.077Z',
  //     text: { body: 'fdcfdfd' },
  //     type: 'text',
  //     direction: 'sent'
  //   }
  // }
  body = req.body;
  const schema = {
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": body.tempMessage.id,
        "changes": [
          {
            "value": {
              "messages": [
                {
                  "from": body.tempMessage.from,
                  "id": body.tempMessage.id,
                  "timestamp": body.tempMessage.timestamp,
                  "text": {
                    "body": body.tempMessage.text.body
                  },
                  "type": "text"
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }
  




  console.log('inside new send message')

  if (schema.object === "whatsapp_business_account") {
    const entry = schema.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    // const { text,contact } = req.body;
    console.log("inside send-message");
    try {
      // const response = await axios.post(
      //   "https://graph.facebook.com/v22.0/580509908477893/messages",
      //   {
      //     messaging_product: "whatsapp",
      //     to : contact,
      //     type: "text",
      //     text: { body: text }
      //   },

      //   {
      //     headers: {
      //       "Content-Type": "application/json",
      //       Authorization: `Bearer ${process.env.TOKEN}` // Use env variable for token
      //     }
      //   }
      // );
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

// Endpoint to send a message
// app.post("/send-message", async (req, res) => {
//   const { text } = req.body;
//   console.log("inside send-message")
//   try {
//     const response = await axios.post(
//       "https://graph.facebook.com/v22.0/580509908477893/messages",
//       // {
//       //   messaging_product: "whatsapp",
//       //   to : "917489638090",
//       //   type: "text",
//       //   text: { body: text1 }
//       // },
//       {
//         messaging_product: "whatsapp",
//         to: "917489638090",
//         type: "text",
//         text: {
//           body: "Hello , please send a message on this number."
//         }
//       },

//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${process.env.TOKEN}` // Use env variable for token
//         }
//       }
//     );

//     const sentMessage = {
//       from: "me",
//       to : "917489638090",
//       timestamp: new Date().toISOString(),
//       text: { body: text },
//       type: "text",
//       direction: "sent"
//     };

//     messages.push(sentMessage); // Store sent message
//     console.log("Sent Message: ", sentMessage);
//     res.status(200).json({ success: true, message: sentMessage });
//   } catch (error) {
//     console.error("Error sending message:", error.response?.data || error.message);
//     res.status(500).json({ success: false, error: "Failed to send message" });
//   }
// });

// Start server
// app.listen(port, () => {
//   console.log(`Server is listening on port ${port}`);
// });

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
