"""Recreate the original Journey to Hell effects. Requires Python 3 and ffmpeg."""
from pathlib import Path
import math
import random
import struct
import subprocess
import tempfile
import wave

RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio"
rng = random.Random(261112)


def tone(samples, start, duration, frequency, amplitude, decay=5, end_frequency=None):
    """A softly attacked, decaying resonant partial."""
    offset = round(start * RATE)
    phase = 0.0
    for index in range(min(round(duration * RATE), len(samples) - offset)):
        position = index / (duration * RATE)
        pitch = frequency + ((end_frequency or frequency) - frequency) * position
        phase += 2 * math.pi * pitch / RATE
        attack = min(1.0, index / (RATE * 0.003))
        tail = min(1.0, (1 - position) * 25)
        envelope = attack * tail * math.exp(-decay * position)
        samples[offset + index] += math.sin(phase) * amplitude * envelope


def noise(samples, start, duration, amplitude, cutoff=0.3):
    """Filtered noise with a smooth envelope for leather, paper, and air."""
    offset = round(start * RATE)
    previous = 0.0
    for index in range(min(round(duration * RATE), len(samples) - offset)):
        position = index / (duration * RATE)
        previous += cutoff * (rng.uniform(-1, 1) - previous)
        envelope = math.sin(math.pi * position) ** 2
        samples[offset + index] += previous * amplitude * envelope


def impact(samples, start, pitch, amplitude):
    tone(samples, start, 0.07, pitch, amplitude, 7)
    tone(samples, start, 0.045, pitch * 2.7, amplitude * 0.35, 8)
    noise(samples, start, 0.022, amplitude * 0.8, 0.75)


def bell(samples, start, frequency, amplitude, duration=0.6):
    for ratio, gain in [(1, 1), (2.01, 0.3), (3.93, 0.12)]:
        tone(samples, start, duration, frequency * ratio, amplitude * gain, 5)


def render(name, duration, design):
    samples = [0.0] * round(duration * RATE)
    design(samples)
    # Retain the relative balance while keeping individual effects below -7 dBFS.
    peak = max(abs(value) for value in samples)
    scale = min(1, 0.44 / peak) if peak else 1
    pcm = b"".join(struct.pack("<h", round(value * scale * 32767)) for value in samples)
    with tempfile.TemporaryDirectory(prefix="jth-sound-") as temporary:
        source = Path(temporary) / (name + ".wav")
        with wave.open(str(source), "wb") as audio:
            audio.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
            audio.writeframes(pcm)
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source), "-codec:a", "libmp3lame", "-b:a", "96k",
            "-map_metadata", "-1", str(OUTPUT / (name + ".mp3")),
        ], check=True)
    print(f"{name}: {duration:.2f}s, peak {peak * scale:.3f}")


def dice(samples):
    for start, pitch, gain in [
        (0.00, 710, 0.35), (0.055, 940, 0.28), (0.13, 640, 0.35),
        (0.22, 1120, 0.23), (0.32, 820, 0.22), (0.43, 660, 0.30),
        (0.51, 560, 0.16),
    ]:
        impact(samples, start, pitch, gain)
    noise(samples, 0.015, 0.38, 0.06, 0.15)


def hit(samples):
    noise(samples, 0, 0.075, 0.4, 0.65)
    tone(samples, 0, 0.17, 150, 0.37, 5, 65)
    for pitch, gain in [(610, 0.15), (1371, 0.1), (2290, 0.04)]:
        tone(samples, 0.018, 0.36, pitch, gain, 7)


def miss(samples):
    noise(samples, 0, 0.25, 0.27, 0.22)
    tone(samples, 0.03, 0.19, 370, 0.045, 4, 125)


def success(samples):
    bell(samples, 0, 440, 0.17)
    bell(samples, 0.10, 660, 0.13)
    bell(samples, 0.20, 880, 0.10)


def failure(samples):
    tone(samples, 0, 0.45, 220, 0.20, 5, 165)
    tone(samples, 0.07, 0.40, 130.81, 0.12, 5)
    noise(samples, 0, 0.09, 0.06, 0.15)


def page(samples):
    noise(samples, 0, 0.16, 0.20, 0.38)
    noise(samples, 0.12, 0.10, 0.10, 0.14)
    impact(samples, 0.15, 420, 0.055)


def combat(samples):
    tone(samples, 0, 0.9, 82.41, 0.24, 5)
    tone(samples, 0.025, 0.75, 164.81, 0.13, 5)
    bell(samples, 0, 311.13, 0.08, 0.9)
    noise(samples, 0, 0.1, 0.18, 0.35)


def death(samples):
    bell(samples, 0, 146.83, 0.19, 1.1)
    tone(samples, 0.02, 1.05, 73.42, 0.20, 5)
    tone(samples, 0.08, 0.8, 155.56, 0.055, 6)


OUTPUT.mkdir(parents=True, exist_ok=True)
for name, duration, design in [
    ("dice", 0.6, dice), ("hit", 0.42, hit), ("miss", 0.30, miss),
    ("success", 0.85, success), ("failure", 0.55, failure),
    ("page", 0.25, page), ("combat", 1.0, combat), ("death", 1.2, death),
]:
    render(name, duration, design)
