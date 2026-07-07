const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and Form submissions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static frontend files automatically from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 1. Updated Connection Pool for Railway Production Environment
const pool = mysql.createPool({
    host: process.env.RAILWAY_PRIVATE_DOMAIN || process.env.MARIADBHOST || 'localhost',
    user: process.env.MARIADBUSER || 'root',
    password: process.env.MARIADB_ROOT_PASSWORD || process.env.MARIADBPASSWORD,
    database: process.env.MARIADB_DATABASE || process.env.MARIADBDATABASE || 'expense_tracker',
    port: process.env.MARIADBPORT ? parseInt(process.env.MARIADBPORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the cloud database connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MariaDB Cloud Database successfully.');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failure during startup:', error.message);
    }
})();

// 2. POST Endpoint: Receive form data and save to database
app.post('/api/expenses', async (req, res) => {
    const { title, amount, category, vendor_id } = req.body;

    // Direct clean-up: Convert empty form strings to clean database NULL values
    const finalVendorId = (vendor_id === "" || vendor_id === undefined || vendor_id === null) ? null : vendor_id;

    try {
        const [result] = await pool.query(
            'INSERT INTO expenses (title, amount, category, vendor_id) VALUES (?, ?, ?, ?)',
            [title, amount, category, finalVendorId]
        );
        
        console.log(`[Database Sync]: Row successfully saved with ID ${result.insertId}`);
        res.status(201).json({ message: "Expense tracked successfully!", id: result.insertId });
    } catch (error) {
        console.error("❌ Database Insert Error:", error);
        res.status(500).json({ 
            error: "Server error", 
            details: error.toString(),
            code: error.code || "UNKNOWN"
        });
    }
});

// 3. GET Endpoint: Read and view all saved data safely inside the browser
app.get('/api/view-data', async (req, res) => {
    try {
        const [expenses] = await pool.query(`
            SELECT e.id, e.title, e.amount, e.category, v.name AS vendor_name, e.created_at 
            FROM expenses e 
            LEFT JOIN vendors v ON e.vendor_id = v.id 
            ORDER BY e.created_at DESC
        `);
        res.json(expenses);
    } catch (error) {
        console.error("❌ Database Fetch Error:", error);
        res.status(500).json({ 
            message: "Database fetch failed", 
            details: error.toString(),
            code: error.code || "UNKNOWN"
        });
    }
});

// Fallback: Redirect any unknown page layouts back to your index form
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening for traffic
app.listen(PORT, () => {
    console.log(`🚀 Production server streaming live on port ${PORT}`);
});