import { OPDEngine } from './engine.js';
import { Doctor, Slot, Source } from './models.js';
import fs from 'fs';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('simulation.log', msg + '\n');
}

async function runSimulation() {
    fs.writeFileSync('simulation.log', '');
    log("=== Starting OPD Simulation (3 Doctor Scenario) ===\n");

    const engine = new OPDEngine();

    // 1. Setup 3 Doctors (Per Requirements)
    log("-> Setting up 3 Doctors...");

    // Dr. Smith (Cardiology)
    const d1 = new Doctor('d1', 'Dr. Smith', 'Cardiology');
    d1.addSlot(new Slot('s1-1', '09:00', '10:00', 3));
    d1.addSlot(new Slot('s1-2', '10:00', '11:00', 3));
    engine.addDoctor(d1);

    // Dr. Jones (Orthopedics)
    const d2 = new Doctor('d2', 'Dr. Jones', 'Orthopedics');
    d2.addSlot(new Slot('s2-1', '09:00', '10:00', 4));
    d2.addSlot(new Slot('s2-2', '10:00', '11:00', 4));
    engine.addDoctor(d2);

    // Dr. Strange (Neurology)
    const d3 = new Doctor('d3', 'Dr. Strange', 'Neurology');
    d3.addSlot(new Slot('s3-1', '09:00', '12:00', 2)); // Long slot, low cap
    engine.addDoctor(d3);

    log("-> Doctors Setup Complete: Smith, Jones, Strange\n");

    // 2. Scenario A: Mixed Sources for Dr. Smith
    log("-> [Dr. Smith] Booking mixed sources...");
    engine.requestToken('d1', 'Alice (Online)', Source.ONLINE);
    engine.requestToken('d1', 'Bob (Walkin)', Source.WALKIN);
    engine.requestToken('d1', 'Charlie (Paid)', Source.PAID);
    printSlot('s1-1', d1); // Full (3/3)

    // 3. Scenario B: Emergency Overflow for Dr. Smith
    log("\n-> [Dr. Smith] Emergency Arrives (Slot Full)...");
    const emerg = engine.requestToken('d1', 'Px EMERGENCY', Source.EMERGENCY);
    log(`   Outcome: ${emerg.success ? 'ACCEPTED' : 'REJECTED'} (Slot: ${emerg.slotId})`);
    printSlot('s1-1', d1); // Elastic Overflow (4/3)

    // 4. Scenario C: Delay for Dr. Jones
    log("\n-> [Dr. Jones] Reporting 15 min delay...");
    engine.reportDelay('d2', 's2-1', 15);
    log("   Dr. Jones Schedule Updated:");
    d2.slots.forEach(s => log(`   Slot ${s.id}: ${s.startTime} - ${s.endTime} (${s.status})`));

    // 5. Scenario D: Dr. Strange (Low Cap)
    log("\n-> [Dr. Strange] Filling Capacity...");
    engine.requestToken('d3', 'User 1', Source.ONLINE);
    engine.requestToken('d3', 'User 2', Source.ONLINE);
    const res3 = engine.requestToken('d3', 'User 3', Source.WALKIN);
    log(`   User 3 (Walkin) Outcome: ${res3.success ? 'Success' : 'REJECTED (Full)'}`);

    log("\n=== Simulation Complete ===");
}

function printSlot(slotId, doctor) {
    const slot = doctor.slots.find(s => s.id === slotId);
    if (!slot) return;
    const names = slot.currentTokens.map(t => `${t.patientName} (${t.priorityScore})`).join(', ');
    log(`   [${slotId}] (${slot.currentTokens.length}/${slot.hardLimit}): ${names}`);
}

runSimulation();
