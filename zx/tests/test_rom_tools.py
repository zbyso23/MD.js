"""Local ROM validator and persistence tests; no CPU emulator/mocks claimed."""
import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import rom_tools as rom

class RomTests(unittest.TestCase):
    def test_blank_and_short_images_rejected(self):
        for data in (b'', b'\0' * 16384, b'\xff' * 16384, b'\0' * 16383):
            with self.subTest(length=len(data)):
                with self.assertRaises(ValueError): rom.inspect(data)

    def test_roundtrip_and_tamper_detection(self):
        # Synthetic test ROM, not a bootable image.
        data=bytes(range(256)) * 64
        with tempfile.TemporaryDirectory() as directory:
            directory=Path(directory)
            source=directory/'input.rom'; source.write_bytes(data)
            target=directory/'zx48.rom'; manifest=directory/'local-rom.json'
            with mock.patch.object(rom,'TARGET',target), mock.patch.object(rom,'META',manifest):
                got=rom.install(source)
                self.assertEqual(got['sha256'],hashlib.sha256(data).hexdigest())
                self.assertEqual(rom.check()['size'],16384)
                self.assertEqual(target.read_bytes(),data)
                tampered=bytearray(data); tampered[5]^=1
                target.write_bytes(tampered)
                with self.assertRaisesRegex(ValueError,'manifest'):
                    rom.check()

    def test_no_implicit_install(self):
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.object(rom,'TARGET',Path(directory)/'absent.rom'):
                with self.assertRaises(FileNotFoundError): rom.check()

    def test_user_rom_if_available(self):
        if not rom.TARGET.exists():self.skipTest('ROM is deliberately omitted from clean distribution')
        info=rom.check()
        self.assertEqual(info['size'],16384)
        self.assertEqual(len(info['sha256']),64)

if __name__=='__main__':unittest.main()
