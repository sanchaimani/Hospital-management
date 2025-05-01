CREATE DATABASE IF NOT EXISTS hospital_management;
USE hospital_management;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    doctorId INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role ENUM('Nurse', 'Receptionist', 'Technician', 'Administrator') NOT NULL,
    department VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initial admin user
INSERT INTO users (username, email, password, role) 
VALUES ('admin', 'admin@hospital.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQVq7x1fX1/.rJx8Lr9v6Qw.Q9aK', 'admin');
-- Password: admin123

select * from hospital_management.staff;


SELECT 
    a.id AS appointment_id,
    a.date AS appointment_date,
    a.time AS appointment_time,
    a.reason AS appointment_reason,
    a.status AS appointment_status,
    p.id AS patient_id,
    p.name AS patient_name,
    p.dob AS patient_dob,
    p.gender AS patient_gender,
    p.phone AS patient_phone,
    p.email AS patient_email,
    p.address AS patient_address,
    p.bloodType AS patient_blood_type,
    d.id AS doctor_id,
    d.name AS doctor_name,
    d.specialization AS doctor_specialization,
    d.phone AS doctor_phone,
    d.email AS doctor_email,
    d.department AS doctor_department,
    s.id AS staff_id,
    s.name AS staff_name,
    s.role AS staff_role,
    s.phone AS staff_phone,
    s.email AS staff_email,
    s.department AS staff_department,
    a.createdAt AS record_created,
    a.updatedAt AS record_updated
FROM 
    appointments a
LEFT JOIN 
    patients p ON a.patientId = p.id
LEFT JOIN 
    doctors d ON a.doctorId = d.id
LEFT JOIN 
    staff s ON (d.department = s.department OR p.id = a.patientId)
ORDER BY 
    a.date DESC, a.time DESC;
