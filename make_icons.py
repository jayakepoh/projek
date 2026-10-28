import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
GREEN = (35, 123, 89, 255)
CREAM = (255, 250, 231, 255)
COFFEE = (92, 54, 35, 255)
ORANGE = (233, 117, 78, 255)
TRANSPARENT = (0, 0, 0, 0)


def inside_polygon(x, y, points):
    inside = False
    previous = points[-1]
    for current in points:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
        previous = current
    return inside


def pixel_color(x, y):
    if not (0 <= x <= 1 and 0 <= y <= 1):
        return TRANSPARENT
    handle_outer = ((x - 0.70) / 0.14) ** 2 + ((y - 0.53) / 0.14) ** 2
    handle_inner = ((x - 0.70) / 0.075) ** 2 + ((y - 0.53) / 0.075) ** 2
    if handle_outer <= 1 and handle_inner >= 1:
        return ORANGE
    cup = inside_polygon(x, y, ((0.25, 0.39), (0.62, 0.39), (0.57, 0.69), (0.31, 0.69)))
    if cup:
        coffee = ((x - 0.435) / 0.185) ** 2 + ((y - 0.405) / 0.027) ** 2 <= 1
        return COFFEE if coffee else CREAM
    if 0.30 <= x <= 0.57 and 0.70 <= y <= 0.735:
        return ORANGE
    steam_lines = (
        ((0.36, 0.31), (0.33, 0.26), (0.38, 0.21)),
        ((0.47, 0.31), (0.50, 0.26), (0.46, 0.21)),
    )
    for start, control, end in steam_lines:
        for step in range(20):
            t = step / 19
            inverse = 1 - t
            px = inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0]
            py = inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1]
            if math.hypot(x - px, y - py) < 0.012:
                return CREAM
    return GREEN


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def create_icon(size):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            rows.extend(pixel_color((x + 0.5) / size, (y + 0.5) / size))
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    data += chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")
    (ROOT / f"icon-{size}.png").write_bytes(data)


if __name__ == "__main__":
    create_icon(192)
    create_icon(512)