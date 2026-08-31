"""
crypto_engine.py
Módulo Criptográfico Híbrido:
- Diffie-Hellman (Intercambio de secretos para K e IV)
- AES-256-CBC (Confidencialidad)
- SHA3-256 (Integridad)
- RSA (Firma Digital, Autenticación y No Repudio)
"""

import os
import json
import base64
import hashlib
from typing import Tuple, Dict, Any, Optional

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding, hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.backends import default_backend

# Parámetros estándar Diffie-Hellman RFC 3526 MODP 2048-bit
DH_PRIME_HEX = (
    "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1"
    "29024E088A67CC74020BBEA63B139B22514A08798E3404DD"
    "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245"
    "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
    "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D"
    "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F"
    "83655D23DCA3AD961C62F356208552BB9ED529077096966D"
    "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
    "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9"
    "DE2BCBF6955817183995497CEA956AE515D2261898FA0510"
    "15728E5A8AACAA68FFFFFFFFFFFFFFFF"
)
DH_PRIME = int(DH_PRIME_HEX, 16)
DH_GENERATOR = 2


class DiffieHellmanParty:
    """Representa un participante en el intercambio Diffie-Hellman para K e IV."""

    def __init__(self, name: str, prime: int = DH_PRIME, generator: int = DH_GENERATOR):
        self.name = name
        self.p = prime
        self.g = generator
        # Secretos para K (a o b)
        self.secret_k = int.from_bytes(os.urandom(32), byteorder="big")
        self.public_k = pow(self.g, self.secret_k, self.p)
        # Secretos para IV (c o d)
        self.secret_iv = int.from_bytes(os.urandom(32), byteorder="big")
        self.public_iv = pow(self.g, self.secret_iv, self.p)

    def compute_shared_key(self, peer_public_k: int) -> bytes:
        """K = peer_public_k ^ secret_k mod p -> Derivado con SHA-256 a 32 bytes."""
        shared_int = pow(peer_public_k, self.secret_k, self.p)
        shared_bytes = shared_int.to_bytes((self.p.bit_length() + 7) // 8, byteorder="big")
        return hashlib.sha256(shared_bytes).digest()  # 32 bytes para AES-256

    def compute_shared_iv(self, peer_public_iv: int) -> bytes:
        """IV = peer_public_iv ^ secret_iv mod p -> Derivado con SHA-256 a 16 bytes."""
        shared_int = pow(peer_public_iv, self.secret_iv, self.p)
        shared_bytes = shared_int.to_bytes((self.p.bit_length() + 7) // 8, byteorder="big")
        return hashlib.sha256(shared_bytes).digest()[:16]  # 16 bytes para AES IV


def compute_sha3_256(data: bytes) -> bytes:
    """Calcula el resumen criptográfico SHA3-256 (el embudo del diagrama)."""
    h = hashlib.sha3_256()
    h.update(data)
    return h.digest()


def compute_sha3_256_hex(data: bytes) -> str:
    return compute_sha3_256(data).hex()


def generate_rsa_keypair(key_size: int = 2048) -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    """Genera par de llaves RSA."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return private_key, public_key


def rsa_private_key_to_pem(private_key: rsa.RSAPrivateKey) -> str:
    """Exporta llave privada a formato PEM."""
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return pem.decode("utf-8")


def rsa_public_key_to_pem(public_key: rsa.RSAPublicKey) -> str:
    """Exporta llave pública a formato PEM."""
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem.decode("utf-8")


def load_rsa_private_key_from_pem(pem_str: str) -> rsa.RSAPrivateKey:
    """Carga llave privada desde texto PEM."""
    return serialization.load_pem_private_key(
        pem_str.encode("utf-8"),
        password=None,
        backend=default_backend()
    )


def load_rsa_public_key_from_pem(pem_str: str) -> rsa.RSAPublicKey:
    """Carga llave pública desde texto PEM."""
    return serialization.load_pem_public_key(
        pem_str.encode("utf-8"),
        backend=default_backend()
    )


def rsa_sign_data(private_key: rsa.RSAPrivateKey, data: bytes) -> bytes:
    """
    Firma el mensaje usando RSA y SHA3-256 (como en el diagrama:
    Mensaje m -> Embudo SHA3-256 -> Digest -> RSA Private Key -> Firma).
    """
    signature = private_key.sign(
        data,
        asym_padding.PSS(
            mgf=asym_padding.MGF1(hashes.SHA3_256()),
            salt_length=asym_padding.PSS.MAX_LENGTH
        ),
        hashes.SHA3_256()
    )
    return signature


def rsa_verify_signature(public_key: rsa.RSAPublicKey, signature: bytes, data: bytes) -> bool:
    """Verifica la firma digital con la llave pública del remitente y SHA3-256."""
    try:
        public_key.verify(
            signature,
            data,
            asym_padding.PSS(
                mgf=asym_padding.MGF1(hashes.SHA3_256()),
                salt_length=asym_padding.PSS.MAX_LENGTH
            ),
            hashes.SHA3_256()
        )
        return True
    except Exception:
        return False


def aes_cbc_encrypt(key: bytes, iv: bytes, plaintext: bytes) -> bytes:
    """Cifra los datos en modo AES-256-CBC con relleno PKCS#7."""
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plaintext) + padder.finalize()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    return encryptor.update(padded_data) + encryptor.finalize()


def aes_cbc_decrypt(key: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    """Descifra datos en modo AES-256-CBC y remueve relleno PKCS#7."""
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(padded_data) + unpadder.finalize()


class HybridPackage:
    """Estructura de paquete híbrido serializable a JSON/.hyb."""

    def __init__(
        self,
        sender: str,
        recipient: str,
        services: Dict[str, bool],
        sender_pubkey_url: str,
        dh_params: Dict[str, str],
        ciphertext_b64: Optional[str] = None,
        signature_b64: Optional[str] = None,
        plaintext_fallback_b64: Optional[str] = None,
        original_hash_hex: Optional[str] = None,
    ):
        self.sender = sender
        self.recipient = recipient
        self.services = services  # {"confidentiality": True, "signature": True}
        self.sender_pubkey_url = sender_pubkey_url
        self.dh_params = dh_params
        self.ciphertext_b64 = ciphertext_b64
        self.signature_b64 = signature_b64
        self.plaintext_fallback_b64 = plaintext_fallback_b64
        self.original_hash_hex = original_hash_hex

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": "1.0",
            "type": "CriptografiaHibrida_ESCOM",
            "sender": self.sender,
            "recipient": self.recipient,
            "services": self.services,
            "sender_pubkey_url": self.sender_pubkey_url,
            "dh_params": self.dh_params,
            "ciphertext": self.ciphertext_b64,
            "signature": self.signature_b64,
            "plaintext_unencrypted": self.plaintext_fallback_b64,
            "original_sha3_hex": self.original_hash_hex,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_json(cls, json_str: str) -> "HybridPackage":
        data = json.loads(json_str)
        return cls(
            sender=data.get("sender", ""),
            recipient=data.get("recipient", ""),
            services=data.get("services", {}),
            sender_pubkey_url=data.get("sender_pubkey_url", ""),
            dh_params=data.get("dh_params", {}),
            ciphertext_b64=data.get("ciphertext"),
            signature_b64=data.get("signature"),
            plaintext_fallback_b64=data.get("plaintext_unencrypted"),
            original_hash_hex=data.get("original_sha3_hex"),
        )
