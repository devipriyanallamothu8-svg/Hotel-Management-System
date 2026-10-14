const express = require("express");
const router = express.Router();
const db = require("../database/database");

// Create food tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS food_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL CHECK(price >= 0),
            description TEXT,
            available INTEGER DEFAULT 1
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS food_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            room_number TEXT,
            order_type TEXT NOT NULL DEFAULT 'Room Service',
            total REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS food_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            food_id INTEGER NOT NULL,
            food_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES food_orders(id),
            FOREIGN KEY (food_id) REFERENCES food_items(id)
        )
    `);

    // Add sample food items only when the menu is empty
    db.get("SELECT COUNT(*) AS count FROM food_items", (err, row) => {
        if (err) {
            console.error("Food menu initialization failed:", err.message);
            return;
        }

        if (row.count === 0) {
            const foods = [
                ["Veg Biryani", "Main Course", 180, "Fragrant vegetable biryani"],
                ["Chicken Biryani", "Main Course", 240, "Chicken biryani with spices"],
                ["Paneer Butter Masala", "Main Course", 200, "Paneer in creamy tomato gravy"],
                ["Masala Dosa", "Breakfast", 90, "Crispy dosa with potato filling"],
                ["Idli (2 pieces)", "Breakfast", 50, "Steamed idlis with chutney"],
                ["French Fries", "Starters", 100, "Crispy golden potato fries"],
                ["Veg Soup", "Starters", 80, "Fresh vegetable soup"],
                ["Fresh Lime Soda", "Drinks", 60, "Refreshing lime drink"]
            ];

            const stmt = db.prepare(
                "INSERT INTO food_items (name, category, price, description) VALUES (?, ?, ?, ?)"
            );

            foods.forEach(food => stmt.run(food));
            stmt.finalize();
        }
    });
});

// GET menu
router.get("/menu", (req, res) => {
    db.all(
        "SELECT * FROM food_items WHERE available = 1 ORDER BY category, name",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: "Unable to load menu" });
            }
            res.json(rows);
        }
    );
});

// POST a food order
router.post("/orders", (req, res) => {
    const { customer_name, room_number, order_type, items } = req.body;

    if (!customer_name || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: "Customer name and at least one food item are required"
        });
    }

    const quantities = new Map();

    for (const item of items) {
        const id = Number(item.food_id);
        const quantity = Number(item.quantity);

        if (!Number.isInteger(id) || id < 1 ||
            !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
            return res.status(400).json({
                error: "Each item must have a valid food_id and quantity from 1 to 50"
            });
        }

        quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const ids = [...quantities.keys()];
    const placeholders = ids.map(() => "?").join(",");

    db.all(
        `SELECT id, name, price FROM food_items
         WHERE available = 1 AND id IN (${placeholders})`,
        ids,
        (err, foods) => {
            if (err) {
                return res.status(500).json({ error: "Unable to verify menu items" });
            }

            if (foods.length !== ids.length) {
                return res.status(400).json({ error: "One or more food items are unavailable" });
            }

            const foodMap = new Map(foods.map(food => [food.id, food]));
            const orderItems = ids.map(id => ({
                food: foodMap.get(id),
                quantity: quantities.get(id)
            }));

            const total = orderItems.reduce(
                (sum, item) => sum + item.food.price * item.quantity, 0
            );

            const type = order_type === "Takeaway" ? "Takeaway" : "Room Service";
            const room = room_number ? String(room_number).trim() : null;

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                db.run(
                    `INSERT INTO food_orders
                     (customer_name, room_number, order_type, total)
                     VALUES (?, ?, ?, ?)`,
                    [String(customer_name).trim(), room, type, total],
                    function (insertErr) {
                        if (insertErr) {
                            return db.run("ROLLBACK", () =>
                                res.status(500).json({ error: "Could not create order" })
                            );
                        }

                        const orderId = this.lastID;
                        const stmt = db.prepare(
                            `INSERT INTO food_order_items
                             (order_id, food_id, food_name, quantity, price)
                             VALUES (?, ?, ?, ?, ?)`
                        );

                        orderItems.forEach(item => {
                            stmt.run([
                                orderId,
                                item.food.id,
                                item.food.name,
                                item.quantity,
                                item.food.price
                            ]);
                        });

                        stmt.finalize(finalizeErr => {
                            if (finalizeErr) {
                                return db.run("ROLLBACK", () =>
                                    res.status(500).json({ error: "Could not save order items" })
                                );
                            }

                            db.run("COMMIT", commitErr => {
                                if (commitErr) {
                                    return db.run("ROLLBACK", () =>
                                        res.status(500).json({ error: "Could not finish order" })
                                    );
                                }

                                res.status(201).json({
                                    message: "Food order placed successfully",
                                    order_id: orderId,
                                    total,
                                    status: "Pending"
                                });
                            });
                        });
                    }
                );
            });
        }
    );
});

// GET all orders (for hotel staff)
router.get("/orders", (req, res) => {
    db.all(
        "SELECT * FROM food_orders ORDER BY id DESC",
        [],
        (err, orders) => {
            if (err) {
                return res.status(500).json({ error: "Unable to load orders" });
            }
            res.json(orders);
        }
    );
});

// Update order status (for hotel staff)
router.patch("/orders/:id/status", (req, res) => {
    const allowed = ["Pending", "Preparing", "Ready", "Served", "Cancelled"];
    const { status } = req.body;

    if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Invalid order status" });
    }

    db.run(
        "UPDATE food_orders SET status = ? WHERE id = ?",
        [status, req.params.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: "Unable to update status" });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Order not found" });
            }
            res.json({ message: "Order status updated", status });
        }
    );
});

// GET individual order and its items
router.get("/orders/:id", (req, res) => {
    db.get(
        "SELECT * FROM food_orders WHERE id = ?",
        [req.params.id],
        (err, order) => {
            if (err) {
                return res.status(500).json({ error: "Unable to load order" });
            }
            if (!order) {
                return res.status(404).json({ error: "Order not found" });
            }

            db.all(
                "SELECT food_name, quantity, price FROM food_order_items WHERE order_id = ?",
                [req.params.id],
                (itemsErr, items) => {
                    if (itemsErr) {
                        return res.status(500).json({ error: "Unable to load order items" });
                    }
                    res.json({ ...order, items });
                }
            );
        }
    );
});

module.exports = router;
