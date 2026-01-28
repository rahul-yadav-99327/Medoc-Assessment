import express from 'express';
import { OPDEngine } from './engine.js';
import { Doctor, Slot } from './models.js';

export const router = express.Router();
const engine = new OPDEngine();

// SEED DATA FOR DEMO
const doc1 = new Doctor('doc1', 'Dr. Pankaj', 'Cardiology');
doc1.addSlot(new Slot('s1', '09:00', '10:00', 3));
doc1.addSlot(new Slot('s2', '10:00', '11:00', 3));
engine.addDoctor(doc1);

const doc2 = new Doctor('doc2', 'Dr. Alia', 'Pediatrics');
doc2.addSlot(new Slot('p1', '09:00', '10:00', 5));
doc2.addSlot(new Slot('p2', '10:00', '11:00', 5));
engine.addDoctor(doc2);

const doc3 = new Doctor('doc3', 'Dr. Rahul', 'Orthopedics');
doc3.addSlot(new Slot('p1', '11:00', '12:00', 2));
doc3.addSlot(new Slot('p2', '12:00', '13:00', 3));
engine.addDoctor(doc3);

// 1. Setup Doctor
router.post('/doctors', (req, res) => {
    try {
        const { id, name, specialty, slots } = req.body;
        const doc = new Doctor(id, name, specialty);

        if (slots && Array.isArray(slots)) {
            slots.forEach(s => {
                doc.addSlot(new Slot(s.id, s.startTime, s.endTime, s.hardLimit));
            });
        }

        engine.addDoctor(doc);
        res.json({ success: true, message: 'Doctor added', doctor: doc });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// 2. Book Token
router.post('/book', (req, res) => {
    try {
        const { doctorId, patientName, source } = req.body;
        const result = engine.requestToken(doctorId, patientName, source);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. Trigger Event (Delay)
router.post('/event/delay', (req, res) => {
    try {
        const { doctorId, slotId, delayMinutes } = req.body;
        engine.reportDelay(doctorId, slotId, parseInt(delayMinutes));
        res.json({ success: true, message: 'Delay reported' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. Cancel Token
router.post('/cancel', (req, res) => {
    try {
        const { doctorId, slotId, tokenIndex } = req.body;
        const success = engine.cancelToken(doctorId, slotId, parseInt(tokenIndex));
        res.json({ success });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. Dashboard / View State
router.get('/dashboard', (req, res) => {
    // Convert Map to Object for JSON response
    const doctors = {};
    for (const [id, doc] of engine.doctors) {
        doctors[id] = doc;
    }
    res.json(doctors);
});
