"""
key_manager.py
Gestor de identidades y llaves para Alicia, Betito y Candy.
Genera, guarda y carga llaves RSA y gestiona URLs públicas para descarga web.
"""

import os
from typing import Dict, Tuple
from crypto_engine import (
    generate_rsa_keypair,
    rsa_private_key_to_pem,
    rsa_public_key_to_pem,
    load_rsa_private_key_from_pem,
    load_rsa_public_key_from_pem,
    DiffieHellmanParty,
)
from cryptography.hazmat.primitives.asymmetric import rsa

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEYS_DIR = os.path.join(BASE_DIR, "keys_store")
PUBLIC_WEB_DIR = os.path.join(BASE_DIR, "public_web")

DEFAULT_USERS = ["Alicia", "Betito", "Candy"]
SERVER_PORT = 8080


class KeyManager:
    """Administra llaves privadas y públicas locales y su exportación para la web."""

    def __init__(self):
        os.makedirs(KEYS_DIR, exist_ok=True)
        os.makedirs(PUBLIC_WEB_DIR, exist_ok=True)
        self.ensure_default_keys()

    def get_private_key_path(self, username: str) -> str:
        return os.path.join(KEYS_DIR, f"{username.lower()}_priv.pem")

    def get_public_key_path(self, username: str) -> str:
        return os.path.join(PUBLIC_WEB_DIR, f"{username.lower()}_pub.pem")

    def get_public_key_url(self, username: str, host: str = "http://localhost:8080") -> str:
        return f"{host}/keys/{username.lower()}_pub.pem"

    def ensure_default_keys(self):
        """Genera llaves por defecto si no existen."""
        for user in DEFAULT_USERS:
            priv_path = self.get_private_key_path(user)
            pub_path = self.get_public_key_path(user)

            if not os.path.exists(priv_path) or not os.path.exists(pub_path):
                self.generate_user_keys(user)

    def generate_user_keys(self, username: str) -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
        """Genera nuevo par de llaves RSA para el usuario y guarda en disco."""
        priv_key, pub_key = generate_rsa_keypair(key_size=2048)
        priv_pem = rsa_private_key_to_pem(priv_key)
        pub_pem = rsa_public_key_to_pem(pub_key)

        with open(self.get_private_key_path(username), "w", encoding="utf-8") as f:
            f.write(priv_pem)

        with open(self.get_public_key_path(username), "w", encoding="utf-8") as f:
            f.write(pub_pem)

        return priv_key, pub_key

    def load_private_key(self, username: str) -> rsa.RSAPrivateKey:
        path = self.get_private_key_path(username)
        if not os.path.exists(path):
            self.generate_user_keys(username)
        with open(path, "r", encoding="utf-8") as f:
            return load_rsa_private_key_from_pem(f.read())

    def load_public_key(self, username: str) -> rsa.RSAPublicKey:
        path = self.get_public_key_path(username)
        if not os.path.exists(path):
            self.generate_user_keys(username)
        with open(path, "r", encoding="utf-8") as f:
            return load_rsa_public_key_from_pem(f.read())

    def load_public_key_pem_text(self, username: str) -> str:
        path = self.get_public_key_path(username)
        if not os.path.exists(path):
            self.generate_user_keys(username)
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
