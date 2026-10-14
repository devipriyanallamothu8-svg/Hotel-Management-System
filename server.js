const express = require("express");
const cors = require("cors");

const db = require("./database/database");

const roomRoutes = require("./routes/rooms");
const customerRoutes = require("./routes/customers");
const bookingRoutes = require("./routes/bookings");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("public"));


app.get("/", (req, res) => {
    res.send("Hotel Management System Server is Running!");
});


app.use("/api/rooms", roomRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/admin", adminRoutes);


const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
