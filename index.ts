import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
// ✅ require('dotenv').config(); লাইনটা বাদ দেওয়া হয়েছে
import { MongoClient, ServerApiVersion } from "mongodb"; // ✅ require-এর বদলে import ব্যবহার করা হয়েছে

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Base Route
app.get("/", (req: Request, res: Response) => {
  res.send("GizmoGrid TypeScript Server is Running!");
});

const uri = process.env.MONGO_DB_URI;

// যদি .env ফাইলে MONGO_DB_URI না থাকে, তবে টাইপস্ক্রিপ্টকে বোঝানোর জন্য একটি চেক দেওয়া ভালো
if (!uri) {
  console.error("❌ Error: MONGO_DB_URI is not defined in .env file");
  process.exit(1);
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const database = client.db(process.env.AUTH_DB_NAME);

    // ১. প্রোডাক্ট বা গেজেটের ডাটা রাখার জন্য (যেটা ফ্রন্টএন্ডে শো করবে)
    const productsCollection = database.collection("products");

    // ২. ইউজারদের কার্ট আইটেম সেভ রাখার জন্য
    const cartsCollection = database.collection("carts");

    // ৩. অর্ডার হিস্টোরি ম্যানেজ করার জন্য (যদি প্রজেক্টে অর্ডার সিস্টেম থাকে)
    const ordersCollection = database.collection("orders");

    // মঙ্গোডিবি থেকে সব প্রোডাক্ট ক্লায়েন্টে পাঠানোর এপিআই
    app.get("/products", async (req: Request, res: Response) => {
      try {
        const products = await productsCollection.find().toArray();
        res.send(products);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch products" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`⚡️ [server]: Server is running at http://localhost:${port}`);
});
