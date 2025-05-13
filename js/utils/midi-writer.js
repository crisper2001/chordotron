// js/utils/midi-writer.js

// --- Start of Embedded jsmidgen (simplified and adapted) ---
const MidiInternal = {};
(function(Midi) {
    'use strict';
    Midi.File = function(options) {
        options = options || {};
        this.tracks = [];
        this.ppqn = options.ppqn || 128; // Pulses per quarter note
    };

    Midi.File.prototype.addTrack = function(track) {
        if (!(track instanceof Midi.Track)) {
            track = new Midi.Track();
        }
        this.tracks.push(track);
        return track;
    };

    Midi.File.prototype.toBytes = function() {
        var
            trackCount = this.tracks.length,
            bytes = 'MThd\x00\x00\x00\x06\x00' + (trackCount > 1 ? '\x01' : '\x00') +
                String.fromCharCode(0, trackCount) +
                String.fromCharCode(this.ppqn >> 8, this.ppqn & 0xFF);

        this.tracks.forEach(function(track) {
            bytes += track.toBytes();
        });
        return bytes;
    };

    Midi.Track = function() {
        this.events = [];
    };

    Midi.Track.prototype.setTempo = function(bpm, time) {
        time = time || 0;
        var mspqn = Math.round(60000000 / bpm); // Microseconds per quarter note
        this.addEvent(new Midi.Event({
            time: time,
            type: Midi.Event.META,
            metaType: Midi.Event.TEMPO,
            data: [ (mspqn >> 16) & 0xFF, (mspqn >> 8) & 0xFF, mspqn & 0xFF ]
        }));
    };

    Midi.Track.prototype.setTimeSignature = function(numerator, denominator, time) {
        time = time || 0;
        let denPowerOfTwo = 0;
        switch (parseInt(denominator)) {
            case 1: denPowerOfTwo = 0; break;
            case 2: denPowerOfTwo = 1; break;
            case 4: denPowerOfTwo = 2; break;
            case 8: denPowerOfTwo = 3; break;
            case 16: denPowerOfTwo = 4; break;
            default: denPowerOfTwo = 2; // Default to /4 if invalid
        }
        this.addEvent(new Midi.Event({
            time: time,
            type: Midi.Event.META,
            metaType: Midi.Event.TIME_SIGNATURE,
            data: [
                numerator,
                denPowerOfTwo,
                24, // MIDI clocks per metronome click (standard)
                8   // Number of 32nd notes per beat (standard)
            ]
        }));
    };
    
    Midi.Track.prototype.addNote = function(channel, pitch, duration, time, velocity) {
        this.addNoteOn(channel, pitch, time, velocity);
        this.addNoteOff(channel, pitch, time + duration); // Velocity for note off is often ignored or 0
    };

    Midi.Track.prototype.addNoteOn = function(channel, pitch, time, velocity) {
        this.addEvent(new Midi.Event({
            time: time || 0,
            type: Midi.Event.NOTE_ON,
            channel: channel || 0,
            param1: pitch,
            param2: velocity || 90
        }));
    };

    Midi.Track.prototype.addNoteOff = function(channel, pitch, time, velocity) {
        this.addEvent(new Midi.Event({
            time: time || 0,
            type: Midi.Event.NOTE_OFF,
            channel: channel || 0,
            param1: pitch,
            param2: velocity || 0 // Velocity for note off is often 0 or 64
        }));
    };
    
    Midi.Track.prototype.addEvent = function(event) {
        this.events.push(event);
    };
    
    Midi.Track.prototype.toBytes = function() {
        var
            event,
            bytes = '',
            length = 0,
            deltaTime,
            lastTime = 0,
            trackEnd = String.fromCharCode(0xFF, Midi.Event.END_OF_TRACK, 0x00); 

        this.events.sort(function(a, b) { return a.time - b.time; });

        this.events.forEach(function(event) {
            deltaTime = event.time - lastTime;
            bytes += Midi.Util.writeVarInt(deltaTime) + event.toBytes();
            length += Midi.Util.writeVarInt(deltaTime).length + event.toBytes().length;
            lastTime = event.time;
        });
        
        bytes += Midi.Util.writeVarInt(0) + trackEnd; 
        length += Midi.Util.writeVarInt(0).length + trackEnd.length;

        return 'MTrk' + String.fromCharCode(
            (length >> 24) & 0xFF,
            (length >> 16) & 0xFF,
            (length >> 8) & 0xFF,
            length & 0xFF
        ) + bytes;
    };

    Midi.Event = function(params) {
        this.time = params.time || 0;
        this.type = params.type;
        this.channel = params.channel || 0;
        this.param1 = params.param1; // Note pitch or controller number
        this.param2 = params.param2; // Velocity or controller value
        this.metaType = params.metaType;
        this.data = params.data;     // Array of bytes for meta events
    };

    Midi.Event.NOTE_OFF = 0x80;
    Midi.Event.NOTE_ON = 0x90;
    Midi.Event.META = 0xFF;
    Midi.Event.TEMPO = 0x51;
    Midi.Event.TIME_SIGNATURE = 0x58;
    Midi.Event.END_OF_TRACK = 0x2F;


    Midi.Event.prototype.toBytes = function() {
        var bytes = '';
        switch (this.type) {
            case Midi.Event.NOTE_OFF:
            case Midi.Event.NOTE_ON:
                bytes = String.fromCharCode((this.type | this.channel), this.param1, this.param2);
                break;
            case Midi.Event.META:
                bytes = String.fromCharCode(this.type, this.metaType);
                if (this.data) {
                    bytes += Midi.Util.writeVarInt(this.data.length);
                    this.data.forEach(function(byte) { bytes += String.fromCharCode(byte); });
                } else {
                     bytes += String.fromCharCode(0); 
                }
                break;
        }
        return bytes;
    };
    
    Midi.Util = {};
    Midi.Util.writeVarInt = function(value) {
        if (value < 0) throw "Cannot write negative variable-length integer.";
        if (value > 0x0FFFFFFF) throw "Cannot write variable-length integer greater than 0x0FFFFFFF.";
        var
            buffer = [],
            b;
        buffer.push(value & 0x7F);
        while (value >>= 7) {
            buffer.push((value & 0x7F) | 0x80);
        }
        buffer.reverse();
        return String.fromCharCode.apply(null, buffer);
    };

}(MidiInternal));
// --- End of Embedded jsmidgen ---

import * as MusicTheory from './music-theory.js';
import { getBeatDurationFactorForTimeSignature } from '../ui/ui-helpers.js'; // Assuming this helper exists

const PPQN = 480; // Pulses per quarter note - common value for better resolution

export function exportProgressionToMidi(voicedChords, bpm, timeSignatureStr, fileName) {
    if (!voicedChords || voicedChords.length === 0) {
        alert("No chords to export.");
        return;
    }

    const file = new MidiInternal.File({ ppqn: PPQN });
    const track = file.addTrack();

    // Set tempo
    track.setTempo(bpm, 0);

    // Set time signature
    const [tsNumerator, tsDenominator] = timeSignatureStr.split('/').map(Number);
    track.setTimeSignature(tsNumerator, tsDenominator, 0);

    let currentTimeTicks = 0;
    const timeSigBeatFactor = getBeatDurationFactorForTimeSignature(timeSignatureStr);

    voicedChords.forEach(chord => {
        const midiNotes = chord.frequencies 
            ? chord.frequencies.map(freq => MusicTheory.frequencyToMidi(freq)).filter(note => note >=0 && note <= 127)
            : [];
        
        // Duration of the chord in quarter notes = chord.beats * timeSigBeatFactor
        // Duration in MIDI ticks = (chord.beats * timeSigBeatFactor) * PPQN
        const durationTicks = Math.round((chord.beats * timeSigBeatFactor) * PPQN);

        if (midiNotes.length > 0) {
            midiNotes.forEach(note => {
                // track.addNote(channel, pitch, duration, time, velocity)
                track.addNote(0, note, durationTicks, currentTimeTicks, 90); // Channel 0, velocity 90
            });
        }
        currentTimeTicks += durationTicks;
    });

    const bytes = file.toBytes();
    const byteArray = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        byteArray[i] = bytes.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'audio/midi' });
    
    return blob;
}
