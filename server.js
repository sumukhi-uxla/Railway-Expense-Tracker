const express = require('express');
const db = require('./db');
const app = express();

// Middlewares
app.use(express.json()); // Lets your app read JSON sent from the frontend
app.use(express.static('public')); // Serves your HTML/CSS/JS frontend files automatically

// 1. CREATE: Add a new expense
app.post('/api/expenses', async (req, res) => {
    const { title, amount, category } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO expenses (title, amount, category) VALUES (?, ?, ?)',
            [title, amount, category]
        );
        res.status(201).json({ id: result.insertId, title, amount, category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. READ: Get all expenses
app.get('/api/expenses', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM expenses ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. UPDATE: Modify an existing expense
app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { title, amount, category } = req.body;
    try {
        await db.query(
            'UPDATE expenses SET title = ?, amount = ?, category = ? WHERE id = ?',
            [title, amount, category, id]
        );
        res.json({ message: 'Expense updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. DELETE: Remove an expense
app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM expenses WHERE id = ?', [id]);
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server executing cleanly on http://localhost:${PORT}`);
});