const express = require("express");
const router = express.Router();

const db = require("../database/database");


// GET dashboard statistics
router.get("/stats", (req, res) => {

    const stats = {};

    // Total rooms
    db.get(
        "SELECT COUNT(*) AS totalRooms FROM rooms",
        [],
        (err, roomResult) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            stats.totalRooms = roomResult.totalRooms;


            // Available rooms
            db.get(
                "SELECT COUNT(*) AS availableRooms FROM rooms WHERE status = 'Available'",
                [],
                (err, availableResult) => {

                    if (err) {
                        return res.status(500).json({
                            error: err.message
                        });
                    }

                    stats.availableRooms =
                        availableResult.availableRooms;


                    // Booked rooms
                    db.get(
                        "SELECT COUNT(*) AS bookedRooms FROM rooms WHERE status = 'Booked'",
                        [],
                        (err, bookedResult) => {

                            if (err) {
                                return res.status(500).json({
                                    error: err.message
                                });
                            }

                            stats.bookedRooms =
                                bookedResult.bookedRooms;


                            // Total customers
                            db.get(
                                "SELECT COUNT(*) AS totalCustomers FROM customers",
                                [],
                                (err, customerResult) => {

                                    if (err) {
                                        return res.status(500).json({
                                            error: err.message
                                        });
                                    }

                                    stats.totalCustomers =
                                        customerResult.totalCustomers;


                                    // Total bookings
                                    db.get(
                                        "SELECT COUNT(*) AS totalBookings FROM bookings",
                                        [],
                                        (err, bookingResult) => {

                                            if (err) {
                                                return res.status(500).json({
                                                    error: err.message
                                                });
                                            }

                                            stats.totalBookings =
                                                bookingResult.totalBookings;


                                            // Total revenue
                                            db.get(
                                                "SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue FROM bookings",
                                                [],
                                                (err, revenueResult) => {

                                                    if (err) {
                                                        return res.status(500).json({
                                                            error: err.message
                                                        });
                                                    }

                                                    stats.totalRevenue =
                                                        revenueResult.totalRevenue;


                                                    res.json(stats);

                                                }
                                            );

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});


module.exports = router;
