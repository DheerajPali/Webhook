require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 8080;

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
      messages.push({ ...message, direction: "received" }); // Store received message with direction
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Endpoint for frontend to fetch messages
app.get("/messages", (req, res) => {
  console.log("Fetched messages endpoint");
  res.status(200).json(messages);
});


app.post("/send-message", async (req, res) => {
  const { text,contact } = req.body;
  console.log("inside send-message")
  try {
    const response = await axios.post(
      "https://graph.facebook.com/v22.0/580509908477893/messages",
      {
        messaging_product: "whatsapp",
        to : contact,
        type: "text",
        text: { body: text }
      },
      
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TOKEN}` // Use env variable for token
        }
      }
    );

    const sentMessage = {
      from: "me",
      to : contact,
      timestamp: new Date().toISOString(),
      text: { body: text },
      type: "text",
      direction: "sent"
    };

    messages.push(sentMessage); // Store sent message
    console.log("Sent Message: ", sentMessage);
    res.status(200).json({ success: true, message: sentMessage });
  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Failed to send message" });
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
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
