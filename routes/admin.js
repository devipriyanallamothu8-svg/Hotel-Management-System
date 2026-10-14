const express = require("express");

const router = express.Router();


// ADMIN LOGIN

router.post("/login", (req, res) => {

    const { username, password } = req.body;


    // Admin credentials

    const ADMIN_USERNAME = "admin";
    const ADMIN_PASSWORD = "admin123";


    // Check credentials

    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {

        return res.json({

            success: true,

            message: "Login successful"

        });

    }


    // Invalid credentials

    res.status(401).json({

        success: false,

        message: "Invalid username or password"

    });

});


module.exports = router;
