const express = require("express");
const router = express.Router();

const db = require("../database/database");

// GET all rooms
router.get("/", (req, res) => {
    db.all("SELECT * FROM rooms", [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});

// ADD a new room
router.post("/", (req, res) => {

    const {
        room_number,
        room_type,
        price
    } = req.body;

    if (!room_number || !room_type || !price) {
        return res.status(400).json({
            error: "Please provide room number, room type and price"
        });
    }

    const sql = `
        INSERT INTO rooms
        (room_number, room_type, price)
        VALUES (?, ?, ?)
    `;

    db.run(
        sql,
        [room_number, room_type, price],
        function (err) {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Room added successfully",
                room_id: this.lastID
            });
        }
    );
});

// UPDATE room status
router.put("/:id", (req, res) => {

    const { status } = req.body;

    const sql = `
        UPDATE rooms
        SET status = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [status, req.params.id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Room status updated successfully"
            });
        }
    );
});

// DELETE a room
router.delete("/:id", (req, res) => {

    db.run(
        "DELETE FROM rooms WHERE id = ?",
        [req.params.id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Room deleted successfully"
            });
        }
    );
});

module.exports = router;
