const express = require("express");

const router = express.Router();

const db = require("../database/database");


// ==========================================
// GET ALL BOOKINGS
// ==========================================

router.get("/", (req, res) => {

    const sql = `
        SELECT
            bookings.id,
            customers.name AS customer_name,
            customers.phone,
            rooms.room_number,
            rooms.room_type,
            rooms.price,
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


// ==========================================
// CREATE BOOKING
// ==========================================

router.post("/", (req, res) => {

    const {
        customer_id,
        room_id,
        check_in,
        check_out
    } = req.body;


    // Check required fields

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


    // Check room

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


            // Check availability

            if (room.status !== "Available") {

                return res.status(400).json({
                    error: "Room is already booked"
                });

            }


            // Calculate nights

            const startDate =
                new Date(check_in);

            const endDate =
                new Date(check_out);


            const difference =
                endDate - startDate;


            const nights =
                difference /
                (1000 * 60 * 60 * 24);


            if (nights <= 0) {

                return res.status(400).json({
                    error:
                        "Check-out date must be after check-in date"
                });

            }


            // Calculate total amount

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


// ==========================================
// CHECK-IN
// ==========================================

router.put("/:id/checkin", (req, res) => {

    const bookingId =
        req.params.id;


    // Check booking

    db.get(

        `
        SELECT *
        FROM bookings
        WHERE id = ?
        `,

        [bookingId],

        (err, booking) => {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            if (!booking) {

                return res.status(404).json({
                    error: "Booking not found"
                });

            }


            // Check current status

            if (booking.status !== "Booked") {

                return res.status(400).json({

                    error:
                        "Only booked reservations can be checked in"

                });

            }


            // Update booking status

            db.run(

                `
                UPDATE bookings
                SET status = 'Checked-In'
                WHERE id = ?
                `,

                [bookingId],

                function (err) {

                    if (err) {

                        return res.status(500).json({
                            error: err.message
                        });

                    }


                    res.json({

                        message:
                            "Customer checked in successfully"

                    });

                }

            );

        }

    );

});


// ==========================================
// CHECK-OUT
// ==========================================

router.put("/:id/checkout", (req, res) => {

    const bookingId =
        req.params.id;


    // Find booking

    db.get(

        `
        SELECT *
        FROM bookings
        WHERE id = ?
        `,

        [bookingId],

        (err, booking) => {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            if (!booking) {

                return res.status(404).json({
                    error: "Booking not found"
                });

            }


            // Check status

            if (booking.status !== "Checked-In") {

                return res.status(400).json({

                    error:
                        "Customer must be checked in before checkout"

                });

            }


            // Update booking

            db.run(

                `
                UPDATE bookings
                SET status = 'Checked-Out'
                WHERE id = ?
                `,

                [bookingId],

                function (err) {

                    if (err) {

                        return res.status(500).json({
                            error: err.message
                        });

                    }


                    // Make room available again

                    db.run(

                        `
                        UPDATE rooms
                        SET status = 'Available'
                        WHERE id = ?
                        `,

                        [booking.room_id],

                        (err) => {

                            if (err) {

                                return res.status(500).json({
                                    error: err.message
                                });

                            }


                            res.json({

                                message:
                                    "Customer checked out successfully"

                            });

                        }

                    );

                }

            );

        }

    );

});


module.exports = router;
