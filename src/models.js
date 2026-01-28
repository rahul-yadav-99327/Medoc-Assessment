/**
 * Data Models for OPD Token Allocation
 */

export const Source = {
  ONLINE: 'ONLINE',
  WALKIN: 'WALKIN',
  PAID: 'PAID',
  PRIORITY: 'PRIORITY',
  EMERGENCY: 'EMERGENCY'
};

const PriorityWeights = {
  [Source.EMERGENCY]: 100,
  [Source.PRIORITY]: 50,
  [Source.PAID]: 50,
  [Source.WALKIN]: 10,
  [Source.ONLINE]: 10
};

export class Token {
  constructor(patientName, source) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.patientName = patientName;
    this.source = source;
    this.priorityScore = PriorityWeights[source] || 0;
    this.timestamp = Date.now(); // For FCFS tie-breaking
    this.assignedSlotId = null;
  }
}

export class Slot {
  constructor(id, startTime, endTime, hardLimit) {
    this.id = id;
    this.startTime = startTime; // "09:00"
    this.endTime = endTime;     // "10:00"
    this.hardLimit = hardLimit;
    this.currentTokens = []; // Array of Token objects
    this.status = 'ON_TIME'; // or 'DELAYED'
  }

  isFull() {
    return this.currentTokens.length >= this.hardLimit;
  }
}

export class Doctor {
  constructor(id, name, specialty) {
    this.id = id;
    this.name = name;
    this.specialty = specialty;
    this.slots = [];
  }

  addSlot(slot) {
    this.slots.push(slot);
  }
}
