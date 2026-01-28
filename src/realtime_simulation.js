import { OPDEngine } from './engine.js';
import { Doctor, Slot, Source } from './models.js';

const engine = new OPDEngine();

// --- Setup ---
function setup() {
    console.log("Initializing Dynamic OPD Simulation...");

    // Dr. Smith (Cardio)
    const d1 = new Doctor('d1', 'Dr. Pankaj', 'Cardiology');
    d1.addSlot(new Slot('s1', '09:00', '10:00', 3));
    d1.addSlot(new Slot('s2', '10:00', '11:00', 3));
    engine.addDoctor(d1);

    // Dr. House (Diagnostics)
    const d2 = new Doctor('d2', 'Dr. Rahul', 'Diagnostics');
    d2.addSlot(new Slot('h1', '09:00', '10:00', 2)); // Strict limit
    d2.addSlot(new Slot('h2', '10:00', '12:00', 4));
    engine.addDoctor(d2);

    console.log("Doctors Ready.\n");
}

// --- Helpers ---
const NAMES = ['Alice', 'Bob', 'Charlie', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const SOURCES = [Source.ONLINE, Source.WALKIN, Source.PAID, Source.EMERGENCY];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// --- Actions ---

function actionBook() {
    const doc = rand(Array.from(engine.doctors.values()));
    const name = `${rand(NAMES)}-${randInt(1, 999)}`;
    const source = Math.random() < 0.8 ? rand([Source.ONLINE, Source.WALKIN]) : rand([Source.PAID, Source.EMERGENCY]);

    try {
        const res = engine.requestToken(doc.id, name, source);
        if (res.success) {
            console.log(`[BOOK] ${name} (${source}) -> ${doc.name} (Slot: ${res.token.assignedSlotId})`);
        } else {
            console.log(`[FULL] ${name} (${source}) -> ${doc.name} Rejected (No Slots)`);
        }
    } catch (e) { console.error("Error booking:", e.message); }
}

function actionCancel() {
    const doc = rand(Array.from(engine.doctors.values()));
    const nonEmptySlots = doc.slots.filter(s => s.currentTokens.length > 0);

    if (nonEmptySlots.length === 0) return; // Nothing to cancel

    const slot = rand(nonEmptySlots);
    const idx = randInt(0, slot.currentTokens.length - 1);
    const token = slot.currentTokens[idx];

    if (engine.cancelToken(doc.id, slot.id, idx)) {
        console.log(`[CANCEL] ${token.patientName} cancelled from ${doc.name} (Slot: ${slot.id})`);
    }
}

function actionDelay() {
    const doc = rand(Array.from(engine.doctors.values()));
    const slot = rand(doc.slots);
    const delay = randInt(10, 45); // 10 to 45 mins

    console.log(`[EVENT] ${doc.name} Slot ${slot.id} DELAYED by ${delay} mins!`);
    engine.reportDelay(doc.id, slot.id, delay);

    // Print new schedule for this doctor
    console.log(`   -> New Schedule: ` + doc.slots.map(s => `${s.startTime}-${s.endTime}`).join(', '));
}

// --- Status Board ---
function printBoard() {
    console.log("\n--- LIVE BOARD STATUS ---");
    for (const doc of engine.doctors.values()) {
        console.log(`${doc.name} (${doc.specialty}):`);
        doc.slots.forEach(s => {
            const usage = `${s.currentTokens.length}/${s.hardLimit}`;
            const bar = '█'.repeat(s.currentTokens.length) + '░'.repeat(Math.max(0, s.hardLimit - s.currentTokens.length));
            const status = s.status === 'DELAYED' ? ' [DELAYED]' : '';
            console.log(`  ${s.startTime}-${s.endTime} | ${usage} [${bar}]${status}`);
        });
    }
    console.log("--------------------------\n");
}


// --- Main Loop ---
setup();

let tick = 0;
setInterval(() => {
    tick++;
    const p = Math.random();

    if (p < 0.6) actionBook();       // 60% Booking
    else if (p < 0.8) actionCancel(); // 20% Cancellation
    else if (p < 0.9) actionDelay();  // 10% Delay
    else console.log("...");          // 10% Idle

    // Every 10 ticks, print board
    if (tick % 10 === 0) printBoard();

}, 1000); // Run every second
