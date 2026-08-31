"""
test_suite.py
Suite de pruebas unitarias y de integración para la Práctica de Criptografía Híbrida.
Verifica:
1. Diffie-Hellman + AES-256-CBC
2. SHA3-256 + RSA Signature
3. Selección de servicios (1 de 2: solo Cifrado, 1 de 2: solo Firma, 2 de 2: Cifrado y Firma)
4. Escenarios de Práctica (A, B, C, D, E, F)
"""

import os
import unittest
from crypto_engine import (
    DiffieHellmanParty,
    compute_sha3_256,
    compute_sha3_256_hex,
    aes_cbc_encrypt,
    aes_cbc_decrypt,
    generate_rsa_keypair,
    rsa_sign_data,
    rsa_verify_signature,
    HybridPackage,
)
from key_manager import KeyManager
from crypto_workflow import HybridCryptoWorkflow
from cloud_manager import CloudManager
from web_server import WebKeyServer


class TestHybridCrypto(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.km = KeyManager()
        cls.workflow = HybridCryptoWorkflow(cls.km)
        cls.cloud = CloudManager()
        cls.server = WebKeyServer()
        cls.server.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def test_01_diffie_hellman_agreement(self):
        """Verifica que ambas partes derivan exactamente la misma clave e IV."""
        alicia = DiffieHellmanParty("Alicia")
        betito = DiffieHellmanParty("Betito")

        k_alicia = alicia.compute_shared_key(betito.public_k)
        k_betito = betito.compute_shared_key(alicia.public_k)
        self.assertEqual(k_alicia, k_betito)
        self.assertEqual(len(k_alicia), 32)  # 256 bits

        iv_alicia = alicia.compute_shared_iv(betito.public_iv)
        iv_betito = betito.compute_shared_iv(alicia.public_iv)
        self.assertEqual(iv_alicia, iv_betito)
        self.assertEqual(len(iv_alicia), 16)  # 128 bits

    def test_02_aes_cbc_encryption_decryption(self):
        """Verifica cifrado y descifrado AES-256-CBC."""
        key = os.urandom(32)
        iv = os.urandom(16)
        message = b"Texto de prueba confidencial para ESCOM IPN"

        ct = aes_cbc_encrypt(key, iv, message)
        self.assertNotEqual(ct, message)

        recovered = aes_cbc_decrypt(key, iv, ct)
        self.assertEqual(recovered, message)

    def test_03_sha3_and_rsa_signature(self):
        """Verifica que SHA3-256 con RSA firma y valida correctamente."""
        priv, pub = generate_rsa_keypair(2048)
        message = b"Mensaje autentico de Alicia"

        sig = rsa_sign_data(priv, message)
        self.assertTrue(rsa_verify_signature(pub, sig, message))

        # Si el mensaje cambia, la firma debe fallar
        corrupt_message = b"Mensaje alterado por Candy"
        self.assertFalse(rsa_verify_signature(pub, sig, corrupt_message))

    def test_04_workflow_both_services_scenario_a(self):
        """Escenario A: Alicia cifra y firma para Betito (2 de 2)."""
        msg = "Mensaje secreto y firmado de Alicia para Betito."
        pkg, log = self.workflow.sender_process("Alicia", "Betito", msg, True, True)

        res = self.workflow.recipient_process(pkg, "Betito")
        self.assertTrue(res["confidentiality_verified"])
        self.assertTrue(res["integrity_verified"])
        self.assertTrue(res["authenticity_verified"])
        self.assertTrue(res["non_repudiation_verified"])
        self.assertEqual(res["recovered_text"], msg)
        self.assertEqual(res["identified_author"], "Alicia")

    def test_05_workflow_candy_scenario_b(self):
        """Escenario B: Candy cifra y firma para Betito."""
        msg = "Mensaje oficial firmado de Candy."
        pkg, log = self.workflow.sender_process("Candy", "Betito", msg, True, True)

        res = self.workflow.recipient_process(pkg, "Betito")
        self.assertTrue(res["integrity_verified"])
        self.assertEqual(res["recovered_text"], msg)
        self.assertEqual(res["identified_author"], "Candy")

    def test_06_service_selection_only_encryption(self):
        """1 de 2: Solo Cifrado (Confidencialidad activa, Firma inactiva)."""
        msg = "Solo confidencialidad."
        pkg, _ = self.workflow.sender_process("Alicia", "Betito", msg, enable_confidentiality=True, enable_signature=False)

        res = self.workflow.recipient_process(pkg, "Betito")
        self.assertTrue(res["confidentiality_verified"])
        self.assertEqual(res["recovered_text"], msg)
        self.assertIsNone(pkg.signature_b64)

    def test_07_service_selection_only_signature(self):
        """1 de 2: Solo Firma (Confidencialidad inactiva, Firma e Integridad activa)."""
        msg = "Solo firma digital publica."
        pkg, _ = self.workflow.sender_process("Alicia", "Betito", msg, enable_confidentiality=False, enable_signature=True)

        res = self.workflow.recipient_process(pkg, "Betito")
        self.assertTrue(res["integrity_verified"])
        self.assertTrue(res["authenticity_verified"])
        self.assertEqual(res["recovered_text"], msg)
        self.assertIsNone(pkg.ciphertext_b64)

    def test_08_scenarios_c_d_e_f(self):
        """Prueba de flujo completo de nube: duplicación x,y,z, alteración y restauración."""
        # Escenario C
        files = self.cloud.prepare_scenario_c()
        self.assertEqual(len(files), 3)

        # Escenario D: Betito inspecciona x, y, z e identifica autor
        authors = {}
        for fn in files:
            pkg = self.cloud.load_package(fn)
            res = self.workflow.recipient_process(pkg, "Betito")
            authors[fn] = res["identified_author"]
            self.assertTrue(res["integrity_verified"])

        self.assertEqual(authors["x.hyb"], "Alicia")
        self.assertEqual(authors["y.hyb"], "Candy")
        self.assertEqual(authors["z.hyb"], "Alicia")

        # Escenario E: Corrupción en x.hyb
        self.cloud.prepare_scenario_e_corrupt("x.hyb")
        pkg_corrupt = self.cloud.load_package("x.hyb")
        res_corrupt = self.workflow.recipient_process(pkg_corrupt, "Betito")
        self.assertFalse(res_corrupt["integrity_verified"])

        # Escenario F: Restauración en x.hyb
        self.cloud.prepare_scenario_f_restore("x.hyb")
        pkg_clean = self.cloud.load_package("x.hyb")
        res_clean = self.workflow.recipient_process(pkg_clean, "Betito")
        self.assertTrue(res_clean["integrity_verified"])
        self.assertEqual(res_clean["identified_author"], "Alicia")


if __name__ == "__main__":
    unittest.main()
