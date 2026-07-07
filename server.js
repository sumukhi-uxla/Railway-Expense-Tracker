const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// Middleware to handle incoming form data and JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static frontend files (HTML, CSS, JS) from a public folder
app.use(express.static(path.join(__dirname, 'public')));

// Set up the database connection pool using Railway's environment variables
const pool = mysql.createPool({
    host: process.env.MARIADBHOST || process.env.RAILWAY_PRIVATE_DOMAIN || 'localhost',
    user: process.env.MARIADBUSER || 'root',
    password: process.env.MARIADBPASSWORD || process.env.MARIADB_ROOT_PASSWORD,
    database: process.env.MARIADBDATABASE || process.env.MARIADB_DATABASE || 'expense_tracker',
    port: process.env.MARIADBPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function to initialize database tables automatically on startup
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MariaDB Cloud Database successfully.');

        // 1. Create Vendors Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS vendors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create Expenses Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100) NOT NULL,
                vendor_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
            );
        `);

        console.log('📚 Database schema verified: "vendors" and "expenses" tables are ready.');
        connection.release();
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
}

// Initialize tables
initializeDatabase();



// Route 1: Save a new vendor
app.post('/api/vendors', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name is required' });

    try {
        await pool.query('INSERT INTO vendors (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name', [name]);
        res.status(201).json({ message: 'Vendor processed successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route 2: Save a new expense
app.post('/api/expenses', async (req, res) => {
    const { title, amount, category, vendor_id } = req.body;
    if (!title || !amount || !category) {
        return res.status(400).json({ error: 'Missing required expense fields' });
    }

    try {
        await pool.query(
            'INSERT INTO expenses (title, amount, category, vendor_id) VALUES (?, ?, ?, ?)',
            [title, amount, category, vendor_id || null]
        );
        res.status(201).json({ message: 'Expense tracked successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route 3: The HeidiSQL Alternative Endpoint (View all data directly as clean JSON)
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
        res.status(500).json({ error: error.message });
    }
});





// Railway injects a dynamic port into process.env.PORT. Fallback to 3000 locally.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Production server streaming live on port ${PORT}`);
});