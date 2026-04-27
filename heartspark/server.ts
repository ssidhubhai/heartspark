import express from "express";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import path from "path";
import admin from "firebase-admin";

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized with service account");
  } else {
    admin.initializeApp();
    console.log("Firebase Admin initialized with default credentials");
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

const db = admin.apps.length ? admin.firestore() : null;
const messaging = admin.apps.length ? admin.messaging() : null;

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to send push notification
async function sendPushNotification(uid: string, title: string, body: string, data?: any) {
  if (!db || !messaging) return;
  
  try {
    const privateSettings = await db.collection('users').doc(uid).collection('private').doc('settings').get();
    if (privateSettings.exists) {
      const token = privateSettings.data()?.fcmToken;
      if (token) {
        await messaging.send({
          token,
          notification: { title, body },
          data: data || {}
        });
        console.log(`Notification sent to ${uid}`);
      }
    }
  } catch (error) {
    console.error(`Error sending notification to ${uid}:`, error);
  }
}

// Listen for new messages to send notifications
if (db) {
  db.collectionGroup('messages').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const message = change.doc.data();
        const sparkId = change.doc.ref.parent.parent?.id;
        
        if (sparkId) {
          const spark = await db.collection('sparks').doc(sparkId).get();
          const sparkData = spark.data();
          if (sparkData) {
            const recipientId = sparkData.senderId === message.senderId ? sparkData.receiverId : sparkData.senderId;
            const senderName = sparkData.senderId === message.senderId ? sparkData.senderName : sparkData.receiverName;
            
            await sendPushNotification(
              recipientId,
              `New message from ${senderName}`,
              message.text,
              { sparkId, type: 'message' }
            );
          }
        }
      }
    });
  });

  // Listen for new sparks (friend requests/connections)
  db.collection('sparks').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const spark = change.doc.data();
        if (spark.status === 'pending') {
          await sendPushNotification(
            spark.receiverId,
            "New Spark Request! ✨",
            `${spark.senderName} wants to connect with you.`,
            { sparkId: change.doc.id, type: 'spark_request' }
          );
        }
      }
    });
  });
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Love Advice
app.post("/api/ai/advice", async (req, res) => {
  try {
    const { topic, names } = req.body;
    let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    // Filter out placeholders
    if (apiKey === "MY_GEMINI_API_KEY" || apiKey === "YOUR_GEMINI_API_KEY" || !apiKey) {
      return res.status(500).json({ error: "Gemini API Key missing or invalid" });
    }
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        retryOptions: {
          attempts: 2
        }
      }
    });
    
    const prompt = `Give some cute, playful, and slightly funny love advice about ${topic} for ${names}. Keep it short (under 3 sentences) and use emojis.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    res.json({ advice: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error.message || error);
    res.status(500).json({ 
      error: "Failed to generate advice",
      details: error.message || "Unknown error"
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Running on http://localhost:${PORT}`);
      console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV}`);
    });
  }
}

startServer();

export default app;
