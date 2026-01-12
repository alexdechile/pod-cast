/**
 * @file editor-core.js
 * @description Core logic for the non-destructive audio editor. 
 * Defines the data structures for Clips, the Project state, and the AudioEngine.
 */

// --- Constants ---
// Utiliza AppConfig si está disponible, sino fallback a defaults
const CORE_CONFIG = window.AppConfig || { 
    AUDIO: { SAMPLE_RATE: 44100, DEFAULT_DURATION: 60, TIMELINE_PADDING: 10 },
    EDITOR: { CLIP_DEFAULT_COLOR: '#00c3ff' }
};

/**
 * @class Clip
 * @description Represents a segment of audio on the timeline.
 * It references a source buffer but has its own start time, offset, and duration.
 */
class Clip {
    constructor(id, bufferKey, duration) {
        this.id = id || crypto.randomUUID();
        this.bufferKey = bufferKey; // Reference to the Blob/Buffer in memory/DB
        this.startTime = 0; // Where on the timeline this clip starts (seconds)
        this.offset = 0; // Where inside the source audio this clip starts (seconds)
        this.duration = duration; // Length of this clip (seconds)

        // Envelope for volume automation: Array of { time: relative_seconds, gain: 0-1 }
        // Time is relative to the start of the Clip (0 = clip start)
        this.gainPoints = [
            { time: 0, gain: 1 },
            { time: duration, gain: 1 }
        ];

        // Visual properties
        this.color = CORE_CONFIG.EDITOR.CLIP_DEFAULT_COLOR;
        this.selected = false;
        this.layer = 0; // For multi-track support eventually
    }

    /**
     * Updates the duration and ensures the end gain point moves with it if it was at the end.
     */
    setDuration(newDuration) {
        const oldDuration = this.duration;
        this.duration = newDuration;

        // Simple logic: if a point was at the exact end, move it to the new end.
        // Otherwise, keep points. Remove points that are now beyond duration.
        this.gainPoints = this.gainPoints.filter(p => p.time < newDuration);

        // Ensure there's a point at the end
        if (!this.gainPoints.find(p => Math.abs(p.time - newDuration) < 0.01)) {
            this.gainPoints.push({ time: newDuration, gain: 1 });
        }

        this.gainPoints.sort((a, b) => a.time - b.time);
    }
}

/**
 * @class EditorProject
 * @description Manages the state of the editor: list of clips, current playhead, etc.
 */
class EditorProject {
    constructor() {
        this.clips = []; // Array of Clip objects
        this.playhead = 0; // Current global time in seconds
        this.duration = CORE_CONFIG.AUDIO.DEFAULT_DURATION; // Total timeline duration in seconds (expandable)
        this.isPlaying = false;

        // Buffers cache: key -> AudioBuffer
        this.buffers = new Map();
    }

    addClip(clip) {
        this.clips.push(clip);
        this.updateDuration();
    }

    removeClip(clipId) {
        this.clips = this.clips.filter(c => c.id !== clipId);
    }

    getClip(clipId) {
        return this.clips.find(c => c.id === clipId);
    }

    /**
     * Updates project duration to fit all clips + some padding.
     */
    updateDuration() {
        const lastEnd = this.clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
        this.duration = Math.max(this.duration, lastEnd + CONFIG.AUDIO.TIMELINE_PADDING);
    }
}

/**
 * @class AudioEngine
 * @description Handles the Web Audio API context, scheduling, and playback.
 */
class AudioEngine {
    constructor() {
        this.ac = new (window.AudioContext || window.webkitAudioContext)();
        this.activeSources = new Map(); // clipId -> AudioBufferSourceNode
        this.masterGain = this.ac.createGain();
        this.masterGain.connect(this.ac.destination);
    }

    async decodeAudioData(arrayBuffer) {
        return await this.ac.decodeAudioData(arrayBuffer);
    }

    /**
     * Schedules a clip to play.
     * @param {Clip} clip - The clip object.
     * @param {AudioBuffer} buffer - The source buffer.
     * @param {number} startOffset - Global time where playback starts (usually playhead).
     */
    scheduleClip(clip, buffer, startOffset) {
        // Calculate timing
        const clipEnd = clip.startTime + clip.duration;

        // If the clip is completely before the startOffset, don't play it.
        if (clipEnd <= startOffset) return;

        // If the clip starts after the startOffset, schedule it in the future.
        // If the clip is overlapping the startOffset, start it immediately with an offset.

        // "When" is global AudioContext time when the sound should START coming out of speakers.
        // "Offset" is the position inside the buffer to start reading from.
        // "Duration" is how long to play.

        let when, offset, duration;

        if (clip.startTime >= startOffset) {
            // Clip starts in the future relative to now (startOffset)
            when = this.ac.currentTime + (clip.startTime - startOffset);
            offset = clip.offset;
            duration = clip.duration;
        } else {
            // We are starting playback from the middle of this clip
            when = this.ac.currentTime;
            const timeAlreadyPassed = startOffset - clip.startTime;
            offset = clip.offset + timeAlreadyPassed;
            duration = clip.duration - timeAlreadyPassed;
        }

        if (duration <= 0) return;

        const source = this.ac.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.ac.createGain();

        // Simple automation for now: flat gain
        // TODO: Implement full envelope automation here
        gainNode.gain.value = 1;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(when, offset, duration);

        // Store reference to stop it later
        this.activeSources.set(clip.id, source);

        source.onended = () => {
            if (this.activeSources.get(clip.id) === source) {
                this.activeSources.delete(clip.id);
            }
        };
    }

    play(project) {
        if (project.isPlaying) this.stop();

        if (this.ac.state === 'suspended') this.ac.resume();

        const startTime = project.playhead;
        const now = this.ac.currentTime;

        project.clips.forEach(clip => {
            const buffer = project.buffers.get(clip.bufferKey);
            if (buffer) {
                this.scheduleClip(clip, buffer, startTime);
            }
        });

        this.startTimeGlobal = now;
        this.playheadStart = startTime;
        project.isPlaying = true;
    }

    stop(project) {
        this.activeSources.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        this.activeSources.clear();

        if (project) {
            project.isPlaying = false;
            // Update playhead to where we stopped
            if (this.startTimeGlobal) {
                const elapsed = this.ac.currentTime - this.startTimeGlobal;
                project.playhead = this.playheadStart + elapsed;
            }
        }
    }
}

// Export to window
window.EditorCore = {
    Clip,
    EditorProject,
    AudioEngine
};
