"""
crypto_workflow.py
Orquestador de alto nivel para los procesos de Emisor y Receptor de Criptografía Híbrida.
Soporta selección de servicios: 1 de 2, 2 de 2.
"""

import os
import base64
import urllib.request
from typing import Dict, Any, Tuple, Optional

from crypto_engine import (
    DiffieHellmanParty,
    compute_sha3_256,
    compute_sha3_256_hex,
    aes_cbc_encrypt,
    aes_cbc_decrypt,
    rsa_sign_data,
    rsa_verify_signature,
    load_rsa_public_key_from_pem,
    HybridPackage,
    DH_PRIME,
    DH_GENERATOR,
)
from key_manager import KeyManager, SERVER_PORT


class HybridCryptoWorkflow:
    """Ejecuta los flujos completos de Emisión (Alicia/Candy) y Recepción (Betito)."""

    def __init__(self, key_manager: Optional[KeyManager] = None):
        self.km = key_manager or KeyManager()

    def sender_process(
        self,
        sender_name: str,
        recipient_name: str,
        plaintext: str,
        enable_confidentiality: bool = True,
        enable_signature: bool = True,
        custom_pubkey_url: Optional[str] = None,
    ) -> Tuple[HybridPackage, Dict[str, Any]]:
        """
        Ejecuta el proceso del Emisor según el diagrama de la práctica.
        Retorna el objeto HybridPackage y un desglose detallado de los cálculos.
        """
        if not enable_confidentiality and not enable_signature:
            raise ValueError("Debe seleccionar al menos un servicio criptográfico (Cifrado o Firma).")

        raw_bytes = plaintext.encode("utf-8")
        step_log: Dict[str, Any] = {
            "sender": sender_name,
            "recipient": recipient_name,
            "original_length": len(raw_bytes),
            "services": {
                "confidentiality": enable_confidentiality,
                "signature": enable_signature,
            },
        }

        # 1. Diffie-Hellman para K e IV (si Confidencialidad está activa)
        ciphertext_b64 = None
        plaintext_unencrypted_b64 = None
        dh_params = {}

        if enable_confidentiality:
            # Emisor crea sus secretos y parámetros públicos DH
            dh_sender = DiffieHellmanParty(sender_name)
            # Receptor crea sus secretos DH (simulación de acuerdo bilateral)
            dh_recipient = DiffieHellmanParty(recipient_name)

            # Emisor deriva K e IV usando las llaves públicas del receptor
            k_aes = dh_sender.compute_shared_key(dh_recipient.public_k)
            iv_aes = dh_sender.compute_shared_iv(dh_recipient.public_iv)

            # Cifrado AES-256-CBC
            ciphertext_bytes = aes_cbc_encrypt(k_aes, iv_aes, raw_bytes)
            ciphertext_b64 = base64.b64encode(ciphertext_bytes).decode("utf-8")

            dh_params = {
                "g": hex(DH_GENERATOR),
                "p": hex(DH_PRIME),
                "Ka": hex(dh_sender.public_k),
                "Kc": hex(dh_sender.public_iv),
                "Kb": hex(dh_recipient.public_k),
                "Kd": hex(dh_recipient.public_iv),
                # Guardamos secretos del receptor en metadatos para que el receptor pueda reconstruir K e IV
                "_recipient_secret_k": hex(dh_recipient.secret_k),
                "_recipient_secret_iv": hex(dh_recipient.secret_iv),
            }

            step_log["dh"] = {
                "a_secret": hex(dh_sender.secret_k)[:18] + "...",
                "c_secret": hex(dh_sender.secret_iv)[:18] + "...",
                "Ka_public": hex(dh_sender.public_k)[:18] + "...",
                "Kc_public": hex(dh_sender.public_iv)[:18] + "...",
                "Kb_public": hex(dh_recipient.public_k)[:18] + "...",
                "Kd_public": hex(dh_recipient.public_iv)[:18] + "...",
                "K_AES_hex": k_aes.hex(),
                "IV_AES_hex": iv_aes.hex(),
            }
            step_log["aes_ciphertext_b64"] = ciphertext_b64[:32] + "..."
        else:
            plaintext_unencrypted_b64 = base64.b64encode(raw_bytes).decode("utf-8")

        # 2. SHA3-256 y Firma Digital RSA (si Firma está activa)
        signature_b64 = None
        original_hash_hex = compute_sha3_256_hex(raw_bytes)
        step_log["sha3_hash_hex"] = original_hash_hex

        if enable_signature:
            priv_key = self.km.load_private_key(sender_name)
            # Firma digital sobre el mensaje original (como indica el diagrama: m -> embudo SHA3 -> RSA)
            sig_bytes = rsa_sign_data(priv_key, raw_bytes)
            signature_b64 = base64.b64encode(sig_bytes).decode("utf-8")
            step_log["rsa_signature_b64"] = signature_b64[:32] + "..."

        pubkey_url = custom_pubkey_url or self.km.get_public_key_url(sender_name)
        step_log["pubkey_url"] = pubkey_url

        package = HybridPackage(
            sender=sender_name,
            recipient=recipient_name,
            services={
                "confidentiality": enable_confidentiality,
                "signature": enable_signature,
            },
            sender_pubkey_url=pubkey_url,
            dh_params=dh_params,
            ciphertext_b64=ciphertext_b64,
            signature_b64=signature_b64,
            plaintext_fallback_b64=plaintext_unencrypted_b64,
            original_hash_hex=original_hash_hex,
        )

        return package, step_log

    def download_public_key_pem(self, url_or_name: str) -> str:
        """Descarga en vivo la llave pública desde la URL web o la carga localmente."""
        if url_or_name.startswith("http://") or url_or_name.startswith("https://"):
            try:
                req = urllib.request.Request(
                    url_or_name,
                    headers={"User-Agent": "CriptoHibrida-ESCOM/1.0"}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    return response.read().decode("utf-8")
            except Exception as e:
                # Fallback a archivo local si el servidor web no responde
                print(f"[!] Fallo al descargar de {url_or_name}: {e}. Intentando fallback local...")

        # Fallback local buscando por nombre de archivo
        filename = os.path.basename(url_or_name)
        local_path = os.path.join(self.km.get_public_key_path("Alicia"), "..", filename)
        if os.path.exists(local_path):
            with open(local_path, "r", encoding="utf-8") as f:
                return f.read()

        # Si url_or_name es solo el nombre de usuario (ej. Alicia)
        return self.km.load_public_key_pem_text(url_or_name)

    def recipient_process(
        self,
        package: HybridPackage,
        recipient_name: str = "Betito",
        manual_pubkey_pem: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Ejecuta el proceso del Receptor según el diagrama de la práctica.
        Realiza descifrado AES-CBC y verificación SHA3-256 + RSA con llave descargada.
        """
        results: Dict[str, Any] = {
            "recipient": recipient_name,
            "sender_declared": package.sender,
            "pubkey_url": package.sender_pubkey_url,
            "services_requested": package.services,
            "confidentiality_verified": False,
            "integrity_verified": False,
            "authenticity_verified": False,
            "non_repudiation_verified": False,
            "recovered_text": "",
            "errors": [],
            "status_summary": "",
        }

        # 1. Descarga en vivo de la llave pública del remitente
        pubkey_pem = manual_pubkey_pem
        if not pubkey_pem:
            try:
                pubkey_pem = self.download_public_key_pem(package.sender_pubkey_url)
                results["pubkey_downloaded"] = True
                results["pubkey_pem_snippet"] = pubkey_pem[:60] + "..."
            except Exception as e:
                results["pubkey_downloaded"] = False
                results["errors"].append(f"No se pudo descargar llave pública desde {package.sender_pubkey_url}: {e}")

        # 2. Descifrado Simétrico (si Confidencialidad fue activada)
        recovered_bytes: Optional[bytes] = None

        if package.services.get("confidentiality", False):
            if not package.ciphertext_b64:
                results["errors"].append("Paquete no contiene datos cifrados.")
            else:
                try:
                    dh = package.dh_params
                    ka_pub = int(dh["Ka"], 16)
                    kc_pub = int(dh["Kc"], 16)
                    rec_secret_k = int(dh["_recipient_secret_k"], 16)
                    rec_secret_iv = int(dh["_recipient_secret_iv"], 16)
                    prime = int(dh["p"], 16)

                    # Receptor calcula secreto compartido K = Ka ^ secret_k mod p
                    k_shared_int = pow(ka_pub, rec_secret_k, prime)
                    k_shared_bytes = k_shared_int.to_bytes((prime.bit_length() + 7) // 8, byteorder="big")
                    import hashlib
                    k_aes = hashlib.sha256(k_shared_bytes).digest()

                    # Receptor calcula IV compartido = Kc ^ secret_iv mod p
                    iv_shared_int = pow(kc_pub, rec_secret_iv, prime)
                    iv_shared_bytes = iv_shared_int.to_bytes((prime.bit_length() + 7) // 8, byteorder="big")
                    iv_aes = hashlib.sha256(iv_shared_bytes).digest()[:16]

                    results["dh_recomputed"] = {
                        "K_AES_hex": k_aes.hex(),
                        "IV_AES_hex": iv_aes.hex(),
                    }

                    # Descifrado AES-256-CBC
                    ct_bytes = base64.b64decode(package.ciphertext_b64)
                    recovered_bytes = aes_cbc_decrypt(k_aes, iv_aes, ct_bytes)
                    results["recovered_text"] = recovered_bytes.decode("utf-8", errors="replace")
                    results["confidentiality_verified"] = True
                except Exception as e:
                    results["errors"].append(f"Error al descifrar AES-256-CBC: {e}")
        else:
            if package.plaintext_fallback_b64:
                recovered_bytes = base64.b64decode(package.plaintext_fallback_b64)
                results["recovered_text"] = recovered_bytes.decode("utf-8", errors="replace")
                results["confidentiality_verified"] = False  # No se solicitó cifrado

        # 3. Verificación de Integridad y Firma RSA (si Firma fue activada)
        if package.services.get("signature", False):
            if recovered_bytes is None:
                results["errors"].append("No hay mensaje recuperado para verificar firma.")
            elif not package.signature_b64:
                results["errors"].append("Paquete no contiene firma digital.")
            elif not pubkey_pem:
                results["errors"].append("No hay llave pública disponible para verificar firma.")
            else:
                try:
                    # Embudo SHA3-256 del mensaje recuperado
                    calc_hash = compute_sha3_256(recovered_bytes)
                    calc_hash_hex = calc_hash.hex()
                    results["calculated_sha3_hex"] = calc_hash_hex
                    results["expected_sha3_hex"] = package.original_hash_hex

                    # Verificación RSA
                    public_key = load_rsa_public_key_from_pem(pubkey_pem)
                    sig_bytes = base64.b64decode(package.signature_b64)

                    is_signature_valid = rsa_verify_signature(public_key, sig_bytes, recovered_bytes)

                    if is_signature_valid:
                        results["integrity_verified"] = True
                        results["authenticity_verified"] = True
                        results["non_repudiation_verified"] = True
                        results["identified_author"] = package.sender
                    else:
                        # La firma falló (mensaje alterado o llave equivocada)
                        results["integrity_verified"] = False
                        results["authenticity_verified"] = False
                        results["non_repudiation_verified"] = False
                        results["identified_author"] = "DESCONOCIDO / FIRMA INVÁLIDA"
                        results["errors"].append("Firma digital inválida: el mensaje fue alterado o no pertenece al remitente.")
                except Exception as e:
                    results["integrity_verified"] = False
                    results["errors"].append(f"Excepción al verificar firma RSA: {e}")
        else:
            # Si solo se usó confidencialidad, verificamos si tenemos el hash original
            if recovered_bytes is not None:
                calc_hash_hex = compute_sha3_256_hex(recovered_bytes)
                results["calculated_sha3_hex"] = calc_hash_hex
                if package.original_hash_hex:
                    results["integrity_verified"] = (calc_hash_hex == package.original_hash_hex)

        # Resumen de estado
        if not results["errors"]:
            results["status_summary"] = "TODO CORRECTO: Verificación completada con éxito."
        else:
            results["status_summary"] = "ALERTA: Se detectaron anomalías durante la recepción."

        return results
