#!/usr/bin/env python3
"""Prepare a gym-machine render for the app.

Turns a render with a light studio background into a clean square WebP that sits well on the
white exercise card used by the workout screens:

    1. estimates the background range by sampling the image border,
    2. flood-fills the background from eight border seeds,
    3. grows a near-white pass from the border to remove the studio vignette,
    4. crops to the machine, pads to a square and resizes to 720 px on white.

Usage:
    python3 scripts/prepare-exercise-images.py <source> <destination>

Example:
    python3 scripts/prepare-exercise-images.py ~/Pictures/gym/output/butterfly.webp \\
        public/exercises/butterfly.webp
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

MAGIC = (255, 0, 255)
SIZE = 720
NEAR_WHITE_LUMINANCE = 234
NEAR_WHITE_CHROMA = 10


def border_range(image: Image.Image) -> tuple[float, float]:
    width, height = image.size
    pixels = image.load()
    values = []
    for x in range(0, width, max(1, width // 40)):
        values += [pixels[x, 0], pixels[x, 1], pixels[x, height - 1], pixels[x, height - 2]]
    for y in range(0, height, max(1, height // 40)):
        values += [pixels[0, y], pixels[1, y], pixels[width - 1, y], pixels[width - 2, y]]
    luminance = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b in values]
    return min(luminance), max(luminance)


def is_near_white(pixel: tuple[int, int, int]) -> bool:
    luminance = 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]
    return luminance >= NEAR_WHITE_LUMINANCE and (max(pixel) - min(pixel)) <= NEAR_WHITE_CHROMA


def remove_background(image: Image.Image) -> Image.Image:
    width, height = image.size
    low, high = border_range(image)
    tolerance = int(max(18, high - low + 16))

    seeds = [
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (width // 2, height - 1),
        (0, height // 2),
        (width - 1, height // 2),
    ]
    for seed in seeds:
        ImageDraw.floodfill(image, seed, MAGIC, thresh=tolerance)

    pixels = image.load()
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == MAGIC:
                pixels[x, y] = (255, 255, 255)

    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    seen = bytearray(width * height)
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < width and 0 <= y < height):
            continue
        index = y * width + x
        if seen[index] or not is_near_white(pixels[x, y]):
            continue
        seen[index] = 1
        pixels[x, y] = (255, 255, 255)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return image


def crop_and_square(image: Image.Image) -> Image.Image:
    width, height = image.size
    pixels = image.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] != (255, 255, 255):
                xs.append(x)
                ys.append(y)
    if not xs:
        return image

    padding = 6
    image = image.crop(
        (
            max(0, min(xs) - padding),
            max(0, min(ys) - padding),
            min(width, max(xs) + padding),
            min(height, max(ys) + padding),
        )
    )

    side = max(image.size)
    square = Image.new('RGB', (side, side), (255, 255, 255))
    square.paste(image, ((side - image.width) // 2, (side - image.height) // 2))
    return square.resize((SIZE, SIZE), Image.LANCZOS)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 1

    source = Path(argv[1]).expanduser()
    destination = Path(argv[2])
    destination.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(source).convert('RGB')
    prepared = crop_and_square(remove_background(image))
    prepared.save(destination, 'WEBP', quality=90, method=6)
    print(f'{destination} · {destination.stat().st_size // 1024} KB')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
