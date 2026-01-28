import { Source, Token } from './models.js';

export class OPDEngine {
    constructor() {
        this.doctors = new Map(); // doctorId -> Doctor
    }

    addDoctor(doctor) {
        this.doctors.set(doctor.id, doctor);
    }

    /**
     * Request a token for a patient.
     * Logic:
     * 1. Find the target doctor.
     * 2. Iterate through slots to find the first available one.
     * 3. If a slot is full but request is EMERGENCY, allow elastic overflow (or bump logic).
     * 4. If all slots full, return failure (or waitlist - out of scope for MVP).
     */
    requestToken(doctorId, patientName, source) {
        const doctor = this.doctors.get(doctorId);
        if (!doctor) throw new Error('Doctor not found');

        const newToken = new Token(patientName, source);
        let assigned = false;

        // 1. Try to find a slot with space
        for (const slot of doctor.slots) {
            if (!slot.isFull()) {
                this._assignTokenToSlot(slot, newToken);
                assigned = true;
                break;
            }
        }

        // 2. If not assigned, try to see if we can squeeze in an EMERGENCY
        if (!assigned && source === Source.EMERGENCY) {
            // Find the *earliest* slot to insert emergency
            // Policy: Allow emergency to break hard limit by +1 or more?
            // Let's say we allow it.
            const firstSlot = doctor.slots[0];
            if (firstSlot) {
                // Force push to first slot
                console.log(`[ALERT] forcing emergency ${patientName} into slot ${firstSlot.startTime}`);
                this._assignTokenToSlot(firstSlot, newToken);
                assigned = true;
            }
        }

        // 3. (Optional) Priority Bumping
        // If a high priority patient comes (e.g. PAID) and slots are full of WALKINs,
        // we could bump the last WALKIN to the next slot.
        // Implementing a simple version: If full, check if this token > lowest priority token in slot
        if (!assigned && source !== Source.EMERGENCY) {
            for (const slot of doctor.slots) {
                // Sort current tokens to find lowest priority
                // We maintain them sorted, so last is lowest
                const lowestToken = slot.currentTokens[slot.currentTokens.length - 1];
                if (lowestToken && newToken.priorityScore > lowestToken.priorityScore) {
                    // Bump lowestToken to next slot? Or fail it?
                    // Let's try to bump lowestToken to next slot
                    const successBump = this._moveTokenToNextSlot(doctor, lowestToken, slot);
                    if (successBump) {
                        // Remove lowest from this slot
                        slot.currentTokens.pop();
                        // Add new one here
                        this._assignTokenToSlot(slot, newToken);
                        assigned = true;
                        break;
                    }
                }
            }
        }

        if (!assigned) {
            return { success: false, message: 'No slots available' };
        }

        return {
            success: true,
            token: newToken,
            slotId: newToken.assignedSlotId
        };
    }

    _assignTokenToSlot(slot, token) {
        token.assignedSlotId = slot.id;
        slot.currentTokens.push(token);
        this._sortSlotTokens(slot);
    }

    _sortSlotTokens(slot) {
        // Sort by Priority Descending, then Timestamp Ascending
        slot.currentTokens.sort((a, b) => {
            if (b.priorityScore !== a.priorityScore) {
                return b.priorityScore - a.priorityScore;
            }
            return a.timestamp - b.timestamp;
        });
    }

    _moveTokenToNextSlot(doctor, token, currentSlot) {
        // Find index of currentSlot
        const idx = doctor.slots.indexOf(currentSlot);
        if (idx === -1 || idx >= doctor.slots.length - 1) return false; // No next slot

        const nextSlot = doctor.slots[idx + 1];
        // Recursively try to push into next slot
        if (!nextSlot.isFull()) {
            this._assignTokenToSlot(nextSlot, token);
            return true;
        } else {
            // Could recurse further? 
            // For MVP, if next slot is full, we fail the bump
            return false;
        }
    }

    cancelToken(doctorId, slotId, tokenIndex) {
        const doctor = this.doctors.get(doctorId);
        if (!doctor) return false;

        const slot = doctor.slots.find(s => s.id === slotId);
        if (!slot) return false;

        if (tokenIndex < 0 || tokenIndex >= slot.currentTokens.length) return false;

        // Remove token
        slot.currentTokens.splice(tokenIndex, 1);
        return true;
    }

    /**
     * Handle delays.
     * If a slot is delayed, we shift its endTime.
     * This might require shifting subsequent slots.
     */
    reportDelay(doctorId, slotId, delayMinutes) {
        if (delayMinutes > 300) {
            throw new Error('Current Delay limit is 5 hours (300 mins) maximum');
        }

        const doctor = this.doctors.get(doctorId);
        if (!doctor) throw new Error('Doctor not found');

        const slotIndex = doctor.slots.findIndex(s => s.id === slotId);
        if (slotIndex === -1) throw new Error('Slot not found');

        // Shift this slot's EndTime
        // Simplify time math: assume "HH:MM" format
        // A real system would use Date objects or moment.js

        // Propagate delay to all subsequent slots
        for (let i = slotIndex; i < doctor.slots.length; i++) {
            const s = doctor.slots[i];
            s.startTime = this._addMinutes(s.startTime, delayMinutes);
            s.endTime = this._addMinutes(s.endTime, delayMinutes);
            s.status = 'DELAYED';
        }

        return true;
    }

    _addMinutes(timeStr, mins) {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m + mins);
        const nh = d.getHours().toString().padStart(2, '0');
        const nm = d.getMinutes().toString().padStart(2, '0');
        return `${nh}:${nm}`;
    }
}
