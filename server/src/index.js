import "dotenv/config";
import express from "express";
import cors from "cors";
import transactionsRouter from "./routes/transactions.js";
import historicalPricesRouter from "./routes/historicalPrices.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/transactions", transactionsRouter);
app.use("/api/historical-prices", historicalPricesRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
