"""
cloud_manager.py
Gestor de la carpeta compartida en la Nube (Google Drive simulado)
y asistente para la preparación de los escenarios A, B, C, D, E y F de la práctica.
"""

import os
import shutil
import json
from typing import Dict, Any, List
from crypto_workflow import HybridCryptoWorkflow
from crypto_engine import HybridPackage

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUD_DIR = os.path.join(BASE_DIR, "cloud_drive")
BACKUP_DIR = os.path.join(BASE_DIR, "cloud_drive_backup")


class CloudManager:
    """Administra archivos en la nube y prepara las pruebas del video."""

    def __init__(self):
        os.makedirs(CLOUD_DIR, exist_ok=True)
        os.makedirs(BACKUP_DIR, exist_ok=True)
        self.workflow = HybridCryptoWorkflow()

    def list_files(self) -> List[str]:
        """Lista los archivos existentes en la nube."""
        return [f for f in os.listdir(CLOUD_DIR) if f.endswith(".hyb") or f.endswith(".json")]

    def get_file_path(self, filename: str) -> str:
        return os.path.join(CLOUD_DIR, filename)

    def save_package(self, filename: str, package: HybridPackage) -> str:
        """Guarda un paquete híbrido en la nube."""
        path = self.get_file_path(filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(package.to_json(indent=2))
        return path

    def load_package(self, filename_or_path: str) -> HybridPackage:
        """Carga un paquete híbrido desde la nube."""
        if not os.path.isabs(filename_or_path):
            path = self.get_file_path(filename_or_path)
        else:
            path = filename_or_path

        with open(path, "r", encoding="utf-8") as f:
            return HybridPackage.from_json(f.read())

    def prepare_scenario_a(self, message: str = "Hola Betito, soy Alicia. Este es un reporte financiero confidencial y firmado.") -> str:
        """
        Escenario A: Alicia cifra y firma mensaje para Betito.
        """
        pkg, _ = self.workflow.sender_process(
            sender_name="Alicia",
            recipient_name="Betito",
            plaintext=message,
            enable_confidentiality=True,
            enable_signature=True,
        )
        return self.save_package("mensaje_alicia.hyb", pkg)

    def prepare_scenario_b(self, message: str = "Hola Betito, soy Candy. Te envío la lista de precios aprobada.") -> str:
        """
        Escenario B: Candy cifra y firma mensaje para Betito.
        """
        pkg, _ = self.workflow.sender_process(
            sender_name="Candy",
            recipient_name="Betito",
            plaintext=message,
            enable_confidentiality=True,
            enable_signature=True,
        )
        return self.save_package("mensaje_candy.hyb", pkg)

    def prepare_scenario_c(self) -> List[str]:
        """
        Escenario C: Candy altera archivos en la nube, duplica uno para tener 3 archivos:
        x.hyb (Alicia para Betito), y.hyb (Candy para Betito), z.hyb (Duplicado/Clon de Alicia).
        """
        # Aseguramos que existen A y B
        path_a = self.prepare_scenario_a()
        path_b = self.prepare_scenario_b()

        pkg_a = self.load_package(path_a)
        pkg_b = self.load_package(path_b)

        path_x = self.save_package("x.hyb", pkg_a)
        path_y = self.save_package("y.hyb", pkg_b)
        path_z = self.save_package("z.hyb", pkg_a)

        # Crear respaldo limpio para restaurar en F
        shutil.copyfile(path_x, os.path.join(BACKUP_DIR, "x.hyb.bak"))
        shutil.copyfile(path_y, os.path.join(BACKUP_DIR, "y.hyb.bak"))
        shutil.copyfile(path_z, os.path.join(BACKUP_DIR, "z.hyb.bak"))

        return ["x.hyb", "y.hyb", "z.hyb"]

    def prepare_scenario_e_corrupt(self, target_file: str = "x.hyb") -> bool:
        """
        Escenario E: Candy corrompe 1 bit del ciphertext o firma de un archivo en la nube
        para hacer fallar el servicio de Integridad y Firma.
        """
        path = self.get_file_path(target_file)
        if not os.path.exists(path):
            return False

        with open(path, "r", encoding="utf-8") as f:
            data = json.loads(f.read())

        # Respaldar original antes de corromper si no hay respaldo
        bak_path = os.path.join(BACKUP_DIR, f"{target_file}.clean")
        with open(bak_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(data, indent=2))

        # Alterar el primer carácter del ciphertext
        if data.get("ciphertext"):
            ct = data["ciphertext"]
            # Cambiamos un carácter en base64
            altered_char = "Z" if ct[0] != "Z" else "A"
            data["ciphertext"] = altered_char + ct[1:]
        elif data.get("signature"):
            sig = data["signature"]
            altered_char = "Z" if sig[0] != "Z" else "A"
            data["signature"] = altered_char + sig[1:]

        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(data, indent=2))

        return True

    def prepare_scenario_f_restore(self, target_file: str = "x.hyb") -> bool:
        """
        Escenario F: Candy corrige el archivo alterado restaurando su estado íntegro.
        """
        bak_path = os.path.join(BACKUP_DIR, f"{target_file}.clean")
        path = self.get_file_path(target_file)

        if os.path.exists(bak_path):
            shutil.copyfile(bak_path, path)
            return True

        # Fallback a regenerar
        self.prepare_scenario_a()
        return True
