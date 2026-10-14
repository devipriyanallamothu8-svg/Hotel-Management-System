const express = require("express");
const router = express.Router();

const db = require("../database/database");

// GET all customers
router.get("/", (req, res) => {

    db.all(
        "SELECT * FROM customers",
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(rows);
        }
    );
});


// ADD customer
router.post("/", (req, res) => {

    const {
        name,
        email,
        phone,
        address
    } = req.body;


    if (!name || !email || !phone) {

        return res.status(400).json({
            error: "Name, email and phone are required"
        });

    }


    const sql = `
        INSERT INTO customers
        (name, email, phone, address)
        VALUES (?, ?, ?, ?)
    `;


    db.run(
        sql,
        [name, email, phone, address],
        function (err) {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            res.json({
                message: "Customer added successfully",
                customer_id: this.lastID
            });

        }
    );

});


// DELETE customer
router.delete("/:id", (req, res) => {

    db.run(
        "DELETE FROM customers WHERE id = ?",
        [req.params.id],
        function (err) {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            res.json({
                message: "Customer deleted successfully"
            });

        }
    );

});


module.exports = router;
