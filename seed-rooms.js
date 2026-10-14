
const db = require("./database/database");

const rooms = [
    ["101", "Single", 1500],
    ["102", "Single", 1500],
    ["103", "Single", 1500],
    ["104", "Single", 1500],
    ["105", "Single", 1500],
    ["201", "Double", 2500],
    ["202", "Double", 2500],
    ["203", "Double", 2500],
    ["204", "Double", 2500],
    ["205", "Double", 2500],
    ["301", "Deluxe", 3500],
    ["302", "Deluxe", 3500],
    ["303", "Deluxe", 3500],
    ["304", "Deluxe", 3500],
    ["305", "Deluxe", 3500],
    ["401", "Suite", 5000],
    ["402", "Suite", 5000],
    ["403", "Suite", 5000],
    ["404", "Suite", 5000],
    ["405", "Suite", 5000]
];

db.serialize(() => {
    const sql = `
        INSERT OR IGNORE INTO rooms
        (room_number, room_type, price, status)
        VALUES (?, ?, ?, 'Available')
    `;

    const insertRoom = db.prepare(sql);

    rooms.forEach((room) => {
        insertRoom.run(room, (err) => {
            if (err) {
                console.error("Room insert failed:", err.message);
            }
        });
    });

    insertRoom.finalize(() => {
        db.all(
            "SELECT * FROM rooms ORDER BY room_number",
            [],
            (err, rows) => {
                if (err) {
                    console.error(err.message);
                } else {
                    console.log("Rooms currently in database:", rows.length);
                    console.table(rows);
                }

                db.close();
            }
        );
    });
});

