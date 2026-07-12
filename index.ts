import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 🛠️ TypeScript Request Interface Extension
interface CustomRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

const uri = process.env.MONGO_DB_URI;

if (!uri) {
  console.error("❌ Error: MONGO_DB_URI is not defined in .env file");
  process.exit(1);
}

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// 📦 গ্লোবাল ডাটাবেজ কালেকশনস রেডি করা
const database = client.db(process.env.AUTH_DB_NAME);
const productsCollection = database.collection("products");
const cartsCollection = database.collection("carts");
const ordersCollection = database.collection("orders");

// 🔒 Better Auth কালেকশনস (⚠️ মঙ্গোডিবি কম্পাস চেক করে 's' থাকলে sessions/users করে দিও)
const sessionsCollection = database.collection("session"); 
const usersCollection = database.collection("user");

/**
 * ========================================================
 * 🛡️ মিডলওয়্যার: সেলার ভেরিফিকেশন (TypeScript Standard)
 * ========================================================
 */
const verifySeller = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Unauthorized access! Token missing." });
    }

    const token = authHeader.split(' ')[1];
    
    // মঙ্গোডিবিতে Better Auth টোকেন 'token' ফিল্ডে অথবা ডিফল্ট '_id' বা 'id' হিসেবে থাকতে পারে
    let session = await sessionsCollection.findOne({ token: token });
    
    // যদি সেশন না পায়, আইডি দিয়েও একবার চেক করবে
    if (!session) {
      session = await sessionsCollection.findOne({ id: token });
    }
    
    if (!session) {
      return res.status(401).json({ success: false, message: "Invalid or expired session. Server could not find this token." });
    }

    const user = await usersCollection.findOne({ id: session.userId });

    if (!user || user.role !== 'seller') {
      return res.status(403).json({ success: false, message: "Forbidden! শুধু ভেরিফাইড সেলাররাই প্রোডাক্ট যোগ করতে পারবেন।" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ success: false, message: "Authentication failed." });
  }
};

/**
 * ========================================================
 * 🚀 এপিআই রুটস (এখন এগুলো স্বাধীনভাবে গ্লোবালি কাজ করবে)
 * ========================================================
 */

// Base Route
app.get("/", (req: Request, res: Response) => {
  res.send("GizmoGrid TypeScript Server is Running!");
});

console.log("Registering /api/test");

app.get("/api/test", (req: Request, res: Response) => {
  console.log("TEST ROUTE HIT");
  res.send("API OK");
});

console.log("Before products route");
// প্রোডাক্ট যোগ করার Secure POST API
app.post("/api/products", async (req: Request, res: Response) => {
  try {
    console.log("POST ROUTE HIT");

    const productData = req.body;

    if (!productData.title || !productData.price || !productData.image) {
      return res.status(400).send({
        success: false,
        message: "Title, Price, and Image are required!",
      });
    }

    const newProduct = {
      title: productData.title,
      price: parseFloat(productData.price),
      category: productData.category,
      description: productData.description,
      stock: parseInt(productData.stock) || 10,
      image: productData.image,
      sellerId: req.user?.id,
      sellerEmail: req.user?.email,
      createdAt: new Date(),
    };

    const result = await productsCollection.insertOne(newProduct);

    res.status(201).send({
      success: true,
      message: "Product added successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("MongoDB Insertion Error:", error);

    res.status(500).send({
      success: false,
      message: "Internal Server Error.",
    });
  }
});

// 🔌 মঙ্গোডিবি কানেকশন ইনিশিয়ালাইজার
async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("⚡️ Connected to MongoDB Atlas successfully!");
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`⚡️ [server]: Server is running at http://localhost:${port}`);
});

console.log("Routes loaded");



