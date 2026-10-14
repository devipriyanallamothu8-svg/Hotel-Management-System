const express = require("express");

const router = express.Router();

const db = require("../database/database");


// ==========================================
// GET ALL BILLING DETAILS
// ==========================================

router.get("/", (req, res) => {

    const sql = `
        SELECT
            bookings.id AS booking_id,
            customers.name AS customer_name,
            customers.phone,
            customers.email,
            customers.address,
            rooms.room_number,
            rooms.room_type,
            rooms.price,
            bookings.check_in,
            bookings.check_out,
            bookings.total_amount,
            bookings.status,
            payments.amount AS paid_amount,
            payments.payment_method,
            payments.payment_date

        FROM bookings

        JOIN customers
            ON bookings.customer_id = customers.id

        JOIN rooms
            ON bookings.room_id = rooms.id

        LEFT JOIN payments
            ON bookings.id = payments.booking_id

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
// GET BILL FOR ONE BOOKING
// ==========================================

router.get("/bill/:bookingId", (req, res) => {

    const bookingId =
        req.params.bookingId;


    const sql = `
        SELECT
            bookings.id AS booking_id,

            customers.name AS customer_name,
            customers.phone,
            customers.email,
            customers.address,

            rooms.room_number,
            rooms.room_type,
            rooms.price,

            bookings.check_in,
            bookings.check_out,
            bookings.total_amount,
            bookings.status,

            payments.amount AS paid_amount,
            payments.payment_method,
            payments.payment_date

        FROM bookings

        JOIN customers
            ON bookings.customer_id = customers.id

        JOIN rooms
            ON bookings.room_id = rooms.id

        LEFT JOIN payments
            ON bookings.id = payments.booking_id

        WHERE bookings.id = ?

        ORDER BY payments.id DESC

        LIMIT 1
    `;


    db.get(
        sql,
        [bookingId],
        (err, row) => {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            if (!row) {

                return res.status(404).json({
                    error: "Bill not found"
                });

            }


            res.json(row);

        }
    );

});


// ==========================================
// MAKE PAYMENT
// ==========================================

router.post("/payment", (req, res) => {

    const {
        booking_id,
        amount,
        payment_method
    } = req.body;


    if (
        !booking_id ||
        !amount ||
        !payment_method
    ) {

        return res.status(400).json({
            error:
                "Please provide booking, amount and payment method"
        });

    }


    const paymentDate =
        new Date().toISOString();


    const sql = `
        INSERT INTO payments
        (
            booking_id,
            amount,
            payment_date,
            payment_method
        )
        VALUES (?, ?, ?, ?)
    `;


    db.run(
        sql,
        [
            booking_id,
            amount,
            paymentDate,
            payment_method
        ],
        function (err) {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }


            res.json({

                message:
                    "Payment recorded successfully",

                payment_id:
                    this.lastID

            });

        }
    );

});


module.exports = router;
