const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'San61mani@61', 
    database: 'hospital_management'
};

let pool;

async function initDb() {
    pool = mysql.createPool(dbConfig);
    
    try {
        // Create database if it doesn't exist
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();

        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                dob DATE NOT NULL,
                gender VARCHAR(10) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                address VARCHAR(200),
                bloodType VARCHAR(5),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                specialization VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                department VARCHAR(100) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                department VARCHAR(100),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patientId INT NOT NULL,
                doctorId INT NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                reason VARCHAR(200) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database tables initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Initialize database
initDb();

// Authentication Middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization;
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [token]);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Auth APIs
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Check if user already exists
        const [existingUser] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?', 
            [username, email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        // In a real app, you would hash the password here
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, password, role]
        );
        
        res.status(201).json({ 
            token: result.insertId, 
            user: { id: result.insertId, username, email, role } 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        res.json({ 
            token: user.id,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dashboard API
app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
        const [patients] = await pool.query('SELECT COUNT(*) as count FROM patients');
        const [doctors] = await pool.query('SELECT COUNT(*) as count FROM doctors');
        const today = new Date().toISOString().split('T')[0];
        const [appointments] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE date = ?', [today]);
        
        res.json({
            totalPatients: patients[0].count,
            totalDoctors: doctors[0].count,
            todayAppointments: appointments[0].count
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Patient APIs
app.get('/api/patients', authenticate, async (req, res) => {
    try {
        const [patients] = await pool.query('SELECT * FROM patients ORDER BY name');
        res.json(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/patients/:id', authenticate, async (req, res) => {
    try {
        const [patient] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
        
        if (patient.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        res.json(patient[0]);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/patients', authenticate, async (req, res) => {
    try {
        const { name, dob, gender, phone, email, address, bloodType } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO patients (name, dob, gender, phone, email, address, bloodType) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, dob, gender, phone, email, address, bloodType]
        );
        
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/patients/:id', authenticate, async (req, res) => {
    try {
        const { name, dob, gender, phone, email, address, bloodType } = req.body;
        
        const [result] = await pool.query(
            'UPDATE patients SET name = ?, dob = ?, gender = ?, phone = ?, email = ?, address = ?, bloodType = ? WHERE id = ?',
            [name, dob, gender, phone, email, address, bloodType, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/patients/:id', authenticate, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Doctor APIs
app.get('/api/doctors', authenticate, async (req, res) => {
    try {
        const [doctors] = await pool.query('SELECT * FROM doctors ORDER BY name');
        res.json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/doctors/:id', authenticate, async (req, res) => {
    try {
        const [doctor] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
        
        if (doctor.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        res.json(doctor[0]);
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/doctors', authenticate, async (req, res) => {
    try {
        const { name, specialization, phone, email, department } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO doctors (name, specialization, phone, email, department) VALUES (?, ?, ?, ?, ?)',
            [name, specialization, phone, email, department]
        );
        
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error creating doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/doctors/:id', authenticate, async (req, res) => {
    try {
        const { name, specialization, phone, email, department } = req.body;
        
        const [result] = await pool.query(
            'UPDATE doctors SET name = ?, specialization = ?, phone = ?, email = ?, department = ? WHERE id = ?',
            [name, specialization, phone, email, department, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/doctors/:id', authenticate, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Staff APIs
app.get('/api/staff', authenticate, async (req, res) => {
    try {
        const [staff] = await pool.query('SELECT * FROM staff ORDER BY name');
        res.json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/staff/:id', authenticate, async (req, res) => {
    try {
        const [staff] = await pool.query('SELECT * FROM staff WHERE id = ?', [req.params.id]);
        
        if (staff.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        res.json(staff[0]);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/staff', authenticate, async (req, res) => {
    try {
        const { name, role, phone, email, department } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO staff (name, role, phone, email, department) VALUES (?, ?, ?, ?, ?)',
            [name, role, phone, email, department]
        );
        
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/staff/:id', authenticate, async (req, res) => {
    try {
        const { name, role, phone, email, department } = req.body;
        
        const [result] = await pool.query(
            'UPDATE staff SET name = ?, role = ?, phone = ?, email = ?, department = ? WHERE id = ?',
            [name, role, phone, email, department, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/staff/:id', authenticate, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM staff WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Appointment APIs
app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        const [appointments] = await pool.query(`
            SELECT a.*, p.name as patientName, d.name as doctorName 
            FROM appointments a
            LEFT JOIN patients p ON a.patientId = p.id
            LEFT JOIN doctors d ON a.doctorId = d.id
            ORDER BY a.date, a.time
        `);
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/appointments/:id', authenticate, async (req, res) => {
    try {
        const [appointment] = await pool.query(`
            SELECT a.*, p.name as patientName, d.name as doctorName 
            FROM appointments a
            LEFT JOIN patients p ON a.patientId = p.id
            LEFT JOIN doctors d ON a.doctorId = d.id
            WHERE a.id = ?
        `, [req.params.id]);
        
        if (appointment.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json(appointment[0]);
    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/appointments', authenticate, async (req, res) => {
    try {
        const { patientId, doctorId, date, time, reason, status } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO appointments (patientId, doctorId, date, time, reason, status) VALUES (?, ?, ?, ?, ?, ?)',
            [patientId, doctorId, date, time, reason, status]
        );
        
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/appointments/:id', authenticate, async (req, res) => {
    try {
        const { patientId, doctorId, date, time, reason, status } = req.body;
        
        const [result] = await pool.query(
            'UPDATE appointments SET patientId = ?, doctorId = ?, date = ?, time = ?, reason = ?, status = ? WHERE id = ?',
            [patientId, doctorId, date, time, reason, status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/appointments/:id', authenticate, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve HTML files
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'frontend.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
