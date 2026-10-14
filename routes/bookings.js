const express = require("express");
const router = express.Router();

const db = require("../database/database");


// GET all bookings
router.get("/", (req, res) => {

    const sql = `
        SELECT
            bookings.id,
            customers.name AS customer_name,
            rooms.room_number,
            rooms.room_type,
            bookings.check_in,
            bookings.check_out,
            bookings.total_amount,
            bookings.status
        FROM bookings
        JOIN customers
            ON bookings.customer_id = customers.id
        JOIN rooms
            ON bookings.room_id = rooms.id
        ORDER BY bookings.id DESC
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);

    });

});


// CREATE booking
router.post("/", (req, res) => {

    const {
        customer_id,
        room_id,
        check_in,
        check_out
    } = req.body;


    if (
        !customer_id ||
        !room_id ||
        !check_in ||
        !check_out
    ) {

        return res.status(400).json({
            error: "Please provide all booking details"
        });

    }


    // Check room availability
    db.get(
        "SELECT * FROM rooms WHERE id = ?",
        [room_id],
        (err, room) => {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            if (!room) {

                return res.status(404).json({
                    error: "Room not found"
                });

            }


            if (room.status !== "Available") {

                return res.status(400).json({
                    error: "Room is already booked"
                });

            }


            // Calculate number of nights

            const startDate =
                new Date(check_in);

            const endDate =
                new Date(check_out);


            const difference =
                endDate - startDate;


            const nights =
                difference / (1000 * 60 * 60 * 24);


            if (nights <= 0) {

                return res.status(400).json({
                    error: "Check-out date must be after check-in date"
                });

            }


            const totalAmount =
                nights * room.price;


            // Insert booking

            const bookingSQL = `
                INSERT INTO bookings
                (
                    customer_id,
                    room_id,
                    check_in,
                    check_out,
                    total_amount,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 'Booked')
            `;


            db.run(
                bookingSQL,
                [
                    customer_id,
                    room_id,
                    check_in,
                    check_out,
                    totalAmount
                ],
                function (err) {

                    if (err) {

                        return res.status(500).json({
                            error: err.message
                        });

                    }


                    const bookingId =
                        this.lastID;


                    // Change room status

                    db.run(
                        `
                        UPDATE rooms
                        SET status = 'Booked'
                        WHERE id = ?
                        `,
                        [room_id],
                        (err) => {

                            if (err) {

                                return res.status(500).json({
                                    error: err.message
                                });

                            }


                            res.json({

                                message:
                                    "Room booked successfully",

                                booking_id:
                                    bookingId,

                                nights:
                                    nights,

                                total_amount:
                                    totalAmount

                            });

                        }
                    );

                }
            );

        }
    );

});


module.exports = router;
