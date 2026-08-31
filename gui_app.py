"""
gui_app.py
Interfaz Gráfica Principal (GUI) con CustomTkinter para la Práctica de Criptografía Híbrida.
ESCOM - IPN | Dra. Nidia A. Cortez Duarte

Permite:
- Selección de servicios: Cifrado (AES-256-CBC + DH) y/o Firma (SHA3-256 + RSA) (1 de 2, 2 de 2).
- Flujo de Emisor (Alicia / Candy) y Receptor (Betito).
- Control del Servidor Web de Llaves Públicas (Descarga en vivo).
- Asistente interactivo de pruebas para los escenarios del video (A, B, C, D, E, F).
"""

import os
import json
import tkinter as tk
from tkinter import filedialog, messagebox
import customtkinter as ctk
import webbrowser
import threading

from crypto_engine import HybridPackage, compute_sha3_256_hex
from key_manager import KeyManager, SERVER_PORT
from crypto_workflow import HybridCryptoWorkflow
from cloud_manager import CloudManager, CLOUD_DIR
from web_server import WebKeyServer

# Configuración visual CustomTkinter
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class HybridCryptoApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Criptografía Híbrida - ESCOM IPN (AES-CBC + DH + SHA3 + RSA)")
        self.geometry("1100 biographicalx780".replace("biographical", ""))  # 1100x780
        self.geometry("1150x800")
        self.minsize(980, 700)

        # Módulos del sistema
        self.km = KeyManager()
        self.workflow = HybridCryptoWorkflow(self.km)
        self.cloud = CloudManager()
        self.web_server = WebKeyServer(SERVER_PORT)

        # Iniciar servidor web de llaves en background
        self.web_server.start()

        # Construir Interfaz
        self.create_header()
        self.create_tabview()
        self.create_footer()

    def create_header(self):
        header_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="#1a1b26")
        header_frame.pack(fill="x", padx=0, pady=0)

        title_label = ctk.CTkLabel(
            header_frame,
            text="SISTEMA DE CRIPTOGRAFÍA HÍBRIDA",
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color="#7aa2f7"
        )
        title_label.pack(pady=(12, 2))

        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="AES-256-CBC • Diffie-Hellman (K, IV) • SHA3-256 • RSA 2048-bit • Verificación Web",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="#a9b1d6"
        )
        subtitle_label.pack(pady=(0, 10))

    def create_tabview(self):
        self.tabview = ctk.CTkTabview(self, corner_radius=10)
        self.tabview.pack(fill="both", expand=True, padx=15, pady=10)

        # Pestañas principales
        self.tab_sender = self.tabview.add("1. Emisor (Cifrar / Firmar)")
        self.tab_recipient = self.tabview.add("2. Receptor (Descifrar / Verificar)")
        self.tab_scenarios = self.tabview.add("3. Pruebas de Video (A - F)")
        self.tab_web_keys = self.tabview.add("4. Servidor Web de Llaves")

        self.setup_sender_tab()
        self.setup_recipient_tab()
        self.setup_scenarios_tab()
        self.setup_web_keys_tab()

    # ----------------------------------------------------
    # TAB 1: EMISOR (Cifrar / Firmar)
    # ----------------------------------------------------
    def setup_sender_tab(self):
        frame = self.tab_sender

        # Layout en 2 columnas: Izquierda (Controles) y Derecha (Detalles Criptográficos)
        frame.columnconfigure(0, weight=1)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(0, weight=1)

        left_frame = ctk.CTkScrollableFrame(frame, label_text="Configuración del Emisor")
        left_frame.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)

        # 1. Emisor y Receptor
        ctk.CTkLabel(left_frame, text="Identidad del Emisor:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(5, 2))
        self.sender_user_var = ctk.StringVar(value="Alicia")
        self.sender_user_seg = ctk.CTkSegmentedButton(left_frame, values=["Alicia", "Candy"], variable=self.sender_user_var)
        self.sender_user_seg.pack(fill="x", pady=(0, 10))

        ctk.CTkLabel(left_frame, text="Destinatario:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(5, 2))
        self.recipient_user_var = ctk.StringVar(value="Betito")
        self.recipient_entry = ctk.CTkEntry(left_frame, textvariable=self.recipient_user_var, state="disabled")
        self.recipient_entry.pack(fill="x", pady=(0, 10))

        # 2. Selección de Servicios (1 de 2, 2 de 2)
        ctk.CTkLabel(left_frame, text="Servicios Criptográficos Requeridos:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(5, 2))
        self.chk_confidentiality = ctk.CTkCheckBox(
            left_frame, text="Confidencialidad (AES-256-CBC + Diffie-Hellman)",
            onvalue=True, offvalue=False
        )
        self.chk_confidentiality.select()
        self.chk_confidentiality.pack(anchor="w", pady=4)

        self.chk_signature = ctk.CTkCheckBox(
            left_frame, text="Firma Digital (SHA3-256 + RSA 2048-bit)",
            onvalue=True, offvalue=False
        )
        self.chk_signature.select()
        self.chk_signature.pack(anchor="w", pady=4)

        # 3. Entrada de Mensaje
        ctk.CTkLabel(left_frame, text="Mensaje en Claro (m):", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 2))
        self.txt_sender_message = ctk.CTkTextbox(left_frame, height=120)
        self.txt_sender_message.insert("1.0", "Hola Betito, este es un mensaje confidencial y auténtico firmado con SHA3 y RSA.")
        self.txt_sender_message.pack(fill="x", pady=(0, 8))

        btn_row = ctk.CTkFrame(left_frame, fg_color="transparent")
        btn_row.pack(fill="x", pady=4)
        ctk.CTkButton(btn_row, text="📁 Cargar Archivo", width=120, command=self.load_file_to_sender).pack(side="left", padx=2)

        # Botón Ejecutar
        ctk.CTkButton(
            left_frame,
            text="🚀 PROCESAR Y GENERAR PAQUETE HÍBRIDO",
            font=ctk.CTkFont(weight="bold", size=13),
            fg_color="#2e7d32",
            hover_color="#1b5e20",
            height=40,
            command=self.execute_sender_process
        ).pack(fill="x", pady=15)

        # Botón Guardar en Nube
        self.btn_save_cloud = ctk.CTkButton(
            left_frame,
            text="💾 Guardar en Nube / Drive (.hyb)",
            fg_color="#1565c0",
            hover_color="#0d47a1",
            command=self.save_sender_package_to_disk
        )
        self.btn_save_cloud.pack(fill="x", pady=4)

        # Columna Derecha: Visor de Pasos Criptográficos
        right_frame = ctk.CTkFrame(frame)
        right_frame.grid(row=0, column=1, sticky="nsew", padx=8, pady=8)

        ctk.CTkLabel(right_frame, text="Desglose Matemático y Parámetros", font=ctk.CTkFont(weight="bold", size=14)).pack(anchor="w", padx=10, pady=8)
        self.txt_sender_details = ctk.CTkTextbox(right_frame, wrap="none")
        self.txt_sender_details.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        self.last_generated_package = None

    def load_file_to_sender(self):
        filepath = filedialog.askopenfilename(title="Seleccionar archivo de texto")
        if filepath:
            try:
                with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                self.txt_sender_message.delete("1.0", "end")
                self.txt_sender_message.insert("1.0", content)
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo leer el archivo: {e}")

    def execute_sender_process(self):
        sender = self.sender_user_var.get()
        recipient = self.recipient_user_var.get()
        plaintext = self.txt_sender_message.get("1.0", "end-1c").strip()
        conf = bool(self.chk_confidentiality.get())
        sig = bool(self.chk_signature.get())

        if not plaintext:
            messagebox.showwarning("Atención", "El mensaje no puede estar vacío.")
            return

        if not conf and not sig:
            messagebox.showwarning("Atención", "Debe seleccionar al menos un servicio (Cifrado o Firma).")
            return

        try:
            package, log = self.workflow.sender_process(
                sender_name=sender,
                recipient_name=recipient,
                plaintext=plaintext,
                enable_confidentiality=conf,
                enable_signature=sig,
            )
            self.last_generated_package = package

            # Formatear detalles en el visor
            details = []
            details.append("=" * 60)
            details.append(f"  PROCESO DE EMISIÓN REALIZADO: {sender} -> {recipient}")
            details.append("=" * 60)
            details.append(f"Servicios Seleccionados:")
            details.append(f"  • Confidencialidad (AES-256-CBC + DH): {'SÍ' if conf else 'NO'}")
            details.append(f"  • Firma Digital (SHA3-256 + RSA):      {'SÍ' if sig else 'NO'}")
            details.append(f"  • Longitud del Mensaje Original:      {len(plaintext)} caracteres / {log['original_length']} bytes")
            details.append("")

            if conf and "dh" in log:
                dh = log["dh"]
                details.append("--- [1] INTERCAMBIO DIFFIE-HELLMAN (K e IV) ---")
                details.append(f"  Secreto a ({sender} para K):  {dh['a_secret']}")
                details.append(f"  Público Ka = g^a mod n:        {dh['Ka_public']}")
                details.append(f"  Público Kb ({recipient}):       {dh['Kb_public']}")
                details.append(f"  Clave Acordada K_AES (256b):   {dh['K_AES_hex']}")
                details.append(f"  Secreto c ({sender} para IV): {dh['c_secret']}")
                details.append(f"  Público Kc = g^c mod n:        {dh['Kc_public']}")
                details.append(f"  Público Kd ({recipient}):       {dh['Kd_public']}")
                details.append(f"  IV Acordado (128b):            {dh['IV_AES_hex']}")
                details.append("")
                details.append("--- [2] CIFRADO SIMÉTRICO AES-256-CBC ---")
                details.append(f"  Ciphertext (Base64):\n  {package.ciphertext_b64}")
                details.append("")

            if sig:
                details.append("--- [3] INTEGRIDAD & RESUMEN (EMBUDO SHA3-256) ---")
                details.append(f"  Resumen SHA3-256: {log['sha3_hash_hex']}")
                details.append("")
                details.append("--- [4] FIRMA DIGITAL RSA (2048-bit) ---")
                details.append(f"  Firmado con: Llave Privada de {sender}")
                details.append(f"  URL Pública para verificación: {package.sender_pubkey_url}")
                details.append(f"  Firma Digital (Base64):\n  {package.signature_b64}")
                details.append("")

            details.append("=" * 60)
            details.append("Paquete listo para ser enviado a la nube.")

            self.txt_sender_details.delete("1.0", "end")
            self.txt_sender_details.insert("1.0", "\n".join(details))

            messagebox.showinfo("Éxito", "Paquete criptográfico generado exitosamente.")

        except Exception as e:
            messagebox.showerror("Error", f"Fallo al procesar paquete: {e}")

    def save_sender_package_to_disk(self):
        if not self.last_generated_package:
            messagebox.showwarning("Atención", "Primero genere un paquete procesándolo.")
            return

        default_name = f"mensaje_{self.last_generated_package.sender.lower()}.hyb"
        filepath = filedialog.asksaveasfilename(
            initialdir=CLOUD_DIR,
            initialfile=default_name,
            defaultextension=".hyb",
            filetypes=[("Paquete Criptográfico Híbrido", "*.hyb"), ("JSON", "*.json")]
        )
        if filepath:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(self.last_generated_package.to_json())
            messagebox.showinfo("Guardado", f"Paquete guardado en:\n{filepath}")

    # ----------------------------------------------------
    # TAB 2: RECEPTOR (Descifrar / Verificar)
    # ----------------------------------------------------
    def setup_recipient_tab(self):
        frame = self.tab_recipient

        frame.columnconfigure(0, weight=1)
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(0, weight=1)

        left_frame = ctk.CTkScrollableFrame(frame, label_text="Carga y Recepción (Betito)")
        left_frame.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)

        ctk.CTkLabel(left_frame, text="Usuario Receptor Activo:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(5, 2))
        self.recipient_active_var = ctk.StringVar(value="Betito")
        ctk.CTkEntry(left_frame, textvariable=self.recipient_active_var, state="disabled").pack(fill="x", pady=(0, 10))

        # Botón para cargar paquete
        ctk.CTkButton(
            left_frame,
            text="📂 Cargar Paquete desde Nube / Disco (.hyb)",
            font=ctk.CTkFont(weight="bold"),
            fg_color="#1565c0",
            hover_color="#0d47a1",
            height=36,
            command=self.load_package_for_recipient
        ).pack(fill="x", pady=(5, 10))

        # Información del paquete cargado
        self.lbl_loaded_pkg_info = ctk.CTkLabel(
            left_frame,
            text="Ningún paquete cargado",
            font=ctk.CTkFont(size=12),
            text_color="#89ddff",
            justify="left"
        )
        self.lbl_loaded_pkg_info.pack(fill="x", pady=(0, 10))

        # Campo para URL de la llave pública
        ctk.CTkLabel(left_frame, text="URL Web de la Llave Pública:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(5, 2))
        self.pubkey_url_var = ctk.StringVar()
        self.entry_pubkey_url = ctk.CTkEntry(left_frame, textvariable=self.pubkey_url_var)
        self.entry_pubkey_url.pack(fill="x", pady=(0, 10))

        # Botón para Descargar Llave en Vivo
        ctk.CTkButton(
            left_frame,
            text="🌐 Descargar Llave Pública desde Web",
            fg_color="#00838f",
            hover_color="#006064",
            command=self.manual_download_key
        ).pack(fill="x", pady=(0, 15))

        # Botón Ejecutar Descifrado y Verificación
        ctk.CTkButton(
            left_frame,
            text="🔓 DESCIFRAR Y VERIFICAR SERVICIOS",
            font=ctk.CTkFont(weight="bold", size=13),
            fg_color="#6a1b9a",
            hover_color="#4a148c",
            height=42,
            command=self.execute_recipient_process
        ).pack(fill="x", pady=10)

        # Tablero de Estado de Servicios (Semáforos)
        ctk.CTkLabel(left_frame, text="Estado de Servicios Criptográficos:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(15, 5))
        self.status_frame = ctk.CTkFrame(left_frame, fg_color="#1a1b26")
        self.status_frame.pack(fill="x", pady=5)

        self.lbl_svc_conf = ctk.CTkLabel(self.status_frame, text="⚪ Confidencialidad: Pendiente", anchor="w")
        self.lbl_svc_conf.pack(fill="x", padx=10, pady=2)

        self.lbl_svc_integ = ctk.CTkLabel(self.status_frame, text="⚪ Integridad de Datos: Pendiente", anchor="w")
        self.lbl_svc_integ.pack(fill="x", padx=10, pady=2)

        self.lbl_svc_auth = ctk.CTkLabel(self.status_frame, text="⚪ Autenticación: Pendiente", anchor="w")
        self.lbl_svc_auth.pack(fill="x", padx=10, pady=2)

        self.lbl_svc_nonrep = ctk.CTkLabel(self.status_frame, text="⚪ No Repudio: Pendiente", anchor="w")
        self.lbl_svc_nonrep.pack(fill="x", padx=10, pady=2)

        # Columna Derecha: Texto Recuperado y Registro Técnico
        right_frame = ctk.CTkFrame(frame)
        right_frame.grid(row=0, column=1, sticky="nsew", padx=8, pady=8)

        ctk.CTkLabel(right_frame, text="Mensaje Recuperado (m'):", font=ctk.CTkFont(weight="bold", size=13)).pack(anchor="w", padx=10, pady=(8, 2))
        self.txt_recovered_message = ctk.CTkTextbox(right_frame, height=120)
        self.txt_recovered_message.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkLabel(right_frame, text="Bitácora de Verificación Técnica:", font=ctk.CTkFont(weight="bold", size=13)).pack(anchor="w", padx=10, pady=(5, 2))
        self.txt_recipient_log = ctk.CTkTextbox(right_frame, wrap="none")
        self.txt_recipient_log.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        self.loaded_recipient_package = None

    def load_package_for_recipient(self):
        filepath = filedialog.askopenfilename(
            initialdir=CLOUD_DIR,
            title="Seleccionar Paquete .hyb",
            filetypes=[("Paquete Criptográfico", "*.hyb"), ("JSON", "*.json")]
        )
        if filepath:
            try:
                pkg = self.cloud.load_package(filepath)
                self.loaded_recipient_package = pkg
                self.pubkey_url_var.set(pkg.sender_pubkey_url)

                filename = os.path.basename(filepath)
                services_str = ", ".join([k for k, v in pkg.services.items() if v])
                self.lbl_loaded_pkg_info.configure(
                    text=f"Archivo: {filename}\nEmisor declarado: {pkg.sender}\nServicios: {services_str}"
                )
                messagebox.showinfo("Cargado", f"Paquete '{filename}' cargado correctamente.")
            except Exception as e:
                messagebox.showerror("Error", f"Fallo al cargar el paquete: {e}")

    def manual_download_key(self):
        url = self.pubkey_url_var.get().strip()
        if not url:
            messagebox.showwarning("Atención", "Ingrese una URL válida.")
            return

        try:
            pem = self.workflow.download_public_key_pem(url)
            messagebox.showinfo("Descarga Exitosa", f"Llave pública descargada exitosamente ({len(pem)} bytes):\n\n{pem[:150]}...")
        except Exception as e:
            messagebox.showerror("Error de Descarga", f"No se pudo descargar la llave de {url}:\n{e}")

    def execute_recipient_process(self):
        if not self.loaded_recipient_package:
            messagebox.showwarning("Atención", "Primero cargue un paquete .hyb.")
            return

        recipient = self.recipient_active_var.get()
        pkg = self.loaded_recipient_package
        pkg.sender_pubkey_url = self.pubkey_url_var.get().strip()

        try:
            res = self.workflow.recipient_process(pkg, recipient_name=recipient)

            # Mostrar mensaje recuperado
            self.txt_recovered_message.delete("1.0", "end")
            self.txt_recovered_message.insert("1.0", res["recovered_text"])

            # Actualizar Semáforos
            # Confidencialidad
            if pkg.services.get("confidentiality"):
                if res["confidentiality_verified"]:
                    self.lbl_svc_conf.configure(text="🟢 Confidencialidad: VÁLIDA (Descifrado AES-CBC OK)", text_color="#9ece6a")
                else:
                    self.lbl_svc_conf.configure(text="🔴 Confidencialidad: FALLÓ (Error de descifrado)", text_color="#f7768e")
            else:
                self.lbl_svc_conf.configure(text="⚪ Confidencialidad: No solicitada (Texto en claro)", text_color="#a9b1d6")

            # Integridad
            if res["integrity_verified"]:
                self.lbl_svc_integ.configure(text="🟢 Integridad de Datos: VÁLIDA (SHA3-256 Coincide)", text_color="#9ece6a")
            else:
                self.lbl_svc_integ.configure(text="🔴 Integridad de Datos: VIOLADA (Mensaje alterado)", text_color="#f7768e")

            # Autenticación
            if res["authenticity_verified"]:
                author = res.get("identified_author", pkg.sender)
                self.lbl_svc_auth.configure(text=f"🟢 Autenticación: VÁLIDA (Autor: {author})", text_color="#9ece6a")
            else:
                self.lbl_svc_auth.configure(text="🔴 Autenticación: FALLÓ (Firma no auténtica)", text_color="#f7768e")

            # No Repudio
            if res["non_repudiation_verified"]:
                self.lbl_svc_nonrep.configure(text="🟢 No Repudio: GARANTIZADO (Firmado con Llave Privada)", text_color="#9ece6a")
            else:
                self.lbl_svc_nonrep.configure(text="🔴 No Repudio: NO GARANTIZADO", text_color="#f7768e")

            # Bitácora detallada
            log = []
            log.append("=" * 60)
            log.append(f"  RESULTADO DE VERIFICACIÓN PARA RECEPTOR: {recipient}")
            log.append("=" * 60)
            log.append(f"Estado General: {res['status_summary']}")
            log.append(f"Emisor Declarado: {pkg.sender}")
            log.append(f"Autor Identificado por Firma: {res.get('identified_author', 'Ninguno')}")
            log.append(f"Llave Pública Usada: {pkg.sender_pubkey_url}")
            log.append("")

            if "dh_recomputed" in res:
                log.append("--- RECONSTRUCCIÓN DIFFIE-HELLMAN (Receptor) ---")
                log.append(f"  K_AES Reconstruida (256-bit): {res['dh_recomputed']['K_AES_hex']}")
                log.append(f"  IV_AES Reconstruido (128-bit): {res['dh_recomputed']['IV_AES_hex']}")
                log.append("")

            if "calculated_sha3_hex" in res:
                log.append("--- VERIFICACIÓN DE RESUMEN (EMBUDO SHA3-256) ---")
                log.append(f"  SHA3-256 Calculado: {res.get('calculated_sha3_hex')}")
                log.append(f"  SHA3-256 Esperado:  {res.get('expected_sha3_hex')}")
                is_hash_match = (res.get("calculated_sha3_hex") == res.get("expected_sha3_hex"))
                log.append(f"  ¿Resúmenes Idénticos?: {'SÍ (Integridad preservada)' if is_hash_match else 'NO (Alteración detectada)'}")
                log.append("")

            if res["errors"]:
                log.append("--- ERRORES / ALERTAS DETECTADAS ---")
                for err in res["errors"]:
                    log.append(f"  ❌ {err}")
                log.append("")

            log.append("=" * 60)

            self.txt_recipient_log.delete("1.0", "end")
            self.txt_recipient_log.insert("1.0", "\n".join(log))

        except Exception as e:
            messagebox.showerror("Error", f"Fallo en el proceso de recepción: {e}")

    # ----------------------------------------------------
    # TAB 3: PRUEBAS DE VIDEO (Escenarios A - F)
    # ----------------------------------------------------
    def setup_scenarios_tab(self):
        frame = self.tab_scenarios

        scroll = ctk.CTkScrollableFrame(frame, label_text="Asistente de Demostración para Video (Escenarios A - F)")
        scroll.pack(fill="both", expand=True, padx=10, pady=10)

        # A) Alicia cifra y firma para Betito
        box_a = ctk.CTkFrame(scroll, fg_color="#1a1b26")
        box_a.pack(fill="x", pady=6, padx=6)
        ctk.CTkLabel(box_a, text="Prueba A: Alicia cifra y firma para Betito", font=ctk.CTkFont(weight="bold", size=13), text_color="#bb9af7").pack(anchor="w", padx=10, pady=(6, 2))
        ctk.CTkLabel(box_a, text="Genera 'mensaje_alicia.hyb' con Confidencialidad y Firma en la nube.", text_color="#a9b1d6").pack(anchor="w", padx=10, pady=(0, 6))
        ctk.CTkButton(box_a, text="▶ Generar Prueba A (Alicia -> Betito)", fg_color="#2e7d32", command=self.run_scenario_a).pack(anchor="w", padx=10, pady=(0, 8))

        # B) Candy cifra y firma para Betito
        box_b = ctk.CTkFrame(scroll, fg_color="#1a1b26")
        box_b.pack(fill="x", pady=6, padx=6)
        ctk.CTkLabel(box_b, text="Prueba B: Candy cifra y firma para Betito", font=ctk.CTkFont(weight="bold", size=13), text_color="#bb9af7").pack(anchor="w", padx=10, pady=(6, 2))
        ctk.CTkLabel(box_b, text="Genera 'mensaje_candy.hyb' con Confidencialidad y Firma en la nube.", text_color="#a9b1d6").pack(anchor="w", padx=10, pady=(0, 6))
        ctk.CTkButton(box_b, text="▶ Generar Prueba B (Candy -> Betito)", fg_color="#2e7d32", command=self.run_scenario_b).pack(anchor="w", padx=10, pady=(0, 8))

        # C) Candy altera y duplica archivos (x, y, z)
        box_c = ctk.CTkFrame(scroll, fg_color="#1a1b26")
        box_c.pack(fill="x", pady=6, padx=6)
        ctk.CTkLabel(box_c, text="Prueba C: Candy crea 3 archivos en la nube (x, y, z)", font=ctk.CTkFont(weight="bold", size=13), text_color="#bb9af7").pack(anchor="w", padx=10, pady=(6, 2))
        ctk.CTkLabel(box_c, text="Genera x.hyb (de Alicia), y.hyb (de Candy) y z.hyb (duplicado de Alicia).", text_color="#a9b1d6").pack(anchor="w", padx=10, pady=(0, 6))
        ctk.CTkButton(box_c, text="▶ Generar Prueba C (Archivos x, y, z)", fg_color="#e65100", command=self.run_scenario_c).pack(anchor="w", padx=10, pady=(0, 8))

        # D) Betito identifica autor de x, y, z
        box_d = ctk.CTkFrame(scroll, fg_color="#1a1b26")
        box_d.pack(fill="x", pady=6, padx=6)
        ctk.CTkLabel(box_d, text="Prueba D: Betito inspecciona y determina autor de x, y, z", font=ctk.CTkFont(weight="bold", size=13), text_color="#bb9af7").pack(anchor="w", padx=10, pady=(6, 2))
        ctk.CTkLabel(box_d, text="Ejecuta verificación cruzada descargando llaves públicas y mostrando autoría.", text_color="#a9b1d6").pack(anchor="w", padx=10, pady=(0, 6))
        ctk.CTkButton(box_d, text="▶ Ejecutar Prueba D (Identificar Autores)", fg_color="#1565c0", command=self.run_scenario_d).pack(anchor="w", padx=10, pady=(0, 8))

        # E) Candy hace fallar Integridad
        box_e = ctk.CTkFrame(scroll, fg_color="#1a1b26")
        box_e.pack(fill="x", pady=6, padx=6)
        ctk.CTkLabel(box_e, text="Prueba E: Forzar Falla de Integridad (Candy altera x.hyb)", font=ctk.CTkFont(weight="bold", size=13), text_color="#f7768e").pack(anchor="w", padx=10, pady=(6, 2))
        ctk.CTkLabel(box_e, text="Modifica 1 bit en el ciphertext de 'x.hyb'. Betito mostrará que la verificación falla.", text_color="#a9b1d6").pack(anchor="w", padx=10, pady=(0, 6))
        ctk.CTkButton(box_e, text="⚡ Corromper Archivo x.hyb", fg_color="#c62828", hover_color="#b71c1c", command=self.run_scenario_e).pack(anchor="w", padx=10, pady=(0, 8))

        # F) Candy corrige el archivo y Betito verifica bien
        box_f = ctk.CTkFrame(scroll, fg_color="#1a1b26")
        box_f.pack(fill="x", pady=6, padx=6)
        ctk.CTkLabel(box_f, text="Prueba F: Restaurar Archivo Íntegro (Candy corrige)", font=ctk.CTkFont(weight="bold", size=13), text_color="#9ece6a").pack(anchor="w", padx=10, pady=(6, 2))
        ctk.CTkLabel(box_f, text="Restaura x.hyb a su versión original íntegra. Betito mostrará que ahora verifica correctamente.", text_color="#a9b1d6").pack(anchor="w", padx=10, pady=(0, 6))
        ctk.CTkButton(box_f, text="✔ Restaurar Archivo x.hyb", fg_color="#2e7d32", hover_color="#1b5e20", command=self.run_scenario_f).pack(anchor="w", padx=10, pady=(0, 8))

        # Botón para abrir la carpeta de la nube
        ctk.CTkButton(scroll, text="📁 Abrir Carpeta Cloud Drive en Explorador", fg_color="#37474f", command=self.open_cloud_folder).pack(fill="x", pady=12)

    def run_scenario_a(self):
        path = self.cloud.prepare_scenario_a()
        messagebox.showinfo("Prueba A Lista", f"Archivo generado en la nube:\n{path}\n\nListo para que Betito lo cargue en la Pestaña 2.")

    def run_scenario_b(self):
        path = self.cloud.prepare_scenario_b()
        messagebox.showinfo("Prueba B Lista", f"Archivo generado en la nube:\n{path}\n\nListo para que Betito lo cargue en la Pestaña 2.")

    def run_scenario_c(self):
        files = self.cloud.prepare_scenario_c()
        messagebox.showinfo("Prueba C Lista", f"Se generaron los 3 archivos en la nube:\n• {files[0]}\n• {files[1]}\n• {files[2]}")

    def run_scenario_d(self):
        files = ["x.hyb", "y.hyb", "z.hyb"]
        results_txt = ["=== REPORTE DE IDENTIFICACIÓN DE AUTORÍA (BETITO) ==="]

        for fn in files:
            path = self.cloud.get_file_path(fn)
            if not os.path.exists(path):
                results_txt.append(f"\n❌ Archivo {fn} no encontrado. Ejecuta la Prueba C primero.")
                continue

            pkg = self.cloud.load_package(path)
            res = self.workflow.recipient_process(pkg, "Betito")
            results_txt.append(f"\n--- Archivo: {fn} ---")
            results_txt.append(f"Emisor Declarado: {pkg.sender}")
            results_txt.append(f"Autor Verificado con Firma: {res.get('identified_author')}")
            results_txt.append(f"Integridad SHA3: {'VÁLIDA' if res['integrity_verified'] else 'VIOLADA'}")
            results_txt.append(f"Mensaje Recuperado:\n\"{res['recovered_text']}\"")

        msg = "\n".join(results_txt)
        # Mostrar en receptor tab
        self.tabview.set("2. Receptor (Descifrar / Verificar)")
        self.txt_recipient_log.delete("1.0", "end")
        self.txt_recipient_log.insert("1.0", msg)
        messagebox.showinfo("Prueba D Completada", "Inspección de autoría completada. Ver resultados en Bitácora de Receptor.")

    def run_scenario_e(self):
        ok = self.cloud.prepare_scenario_e_corrupt("x.hyb")
        if ok:
            messagebox.showwarning("Prueba E: Archivo Corrompido", "Se alteró intencionalmente el archivo 'x.hyb' en la nube.\n\nAhora cárgalo en la Pestaña 2 (Receptor) y verifica cómo falla la Integridad.")
        else:
            messagebox.showerror("Error", "No se encontró 'x.hyb'. Ejecuta la Prueba C primero.")

    def run_scenario_f(self):
        ok = self.cloud.prepare_scenario_f_restore("x.hyb")
        if ok:
            messagebox.showinfo("Prueba F: Archivo Restaurado", "Se restauró el archivo 'x.hyb' a su estado íntegro original.\n\nAhora cárgalo en la Pestaña 2 (Receptor) y verifica que pasa con éxito.")
        else:
            messagebox.showerror("Error", "No se pudo restaurar 'x.hyb'.")

    def open_cloud_folder(self):
        os.startfile(CLOUD_DIR)

    # ----------------------------------------------------
    # TAB 4: SERVIDOR WEB DE LLAVES PÚBLICAS
    # ----------------------------------------------------
    def setup_web_keys_tab(self):
        frame = self.tab_web_keys

        top_frame = ctk.CTkFrame(frame, fg_color="#1a1b26")
        top_frame.pack(fill="x", padx=10, pady=10)

        ctk.CTkLabel(
            top_frame,
            text="Servidor Web Local de Llaves Públicas",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color="#7aa2f7"
        ).pack(anchor="w", padx=10, pady=(8, 2))

        ctk.CTkLabel(
            top_frame,
            text=f"Servidor activo en: http://localhost:{SERVER_PORT}\nCumple con la exigencia de descarga en vivo de llaves públicas desde página web.",
            text_color="#a9b1d6",
            justify="left"
        ).pack(anchor="w", padx=10, pady=(0, 8))

        btn_box = ctk.CTkFrame(top_frame, fg_color="transparent")
        btn_box.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkButton(
            btn_box,
            text="🌐 Abrir Página Web en Navegador",
            fg_color="#00838f",
            hover_color="#006064",
            command=self.open_web_page
        ).pack(side="left", padx=5)

        ctk.CTkButton(
            btn_box,
            text="🔄 Regenerar Pares de Llaves RSA",
            fg_color="#d84315",
            hover_color="#bf360c",
            command=self.regenerate_all_keys
        ).pack(side="left", padx=5)

        # Visor de Llaves
        ctk.CTkLabel(frame, text="Llaves Públicas Publicadas:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=10, pady=(10, 4))
        self.txt_keys_view = ctk.CTkTextbox(frame, wrap="none")
        self.txt_keys_view.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.refresh_keys_view()

    def open_web_page(self):
        webbrowser.open(f"http://localhost:{SERVER_PORT}")

    def regenerate_all_keys(self):
        if messagebox.askyesno("Confirmar", "¿Deseas regenerar los pares de llaves RSA para Alicia, Betito y Candy?"):
            self.km.generate_user_keys("Alicia")
            self.km.generate_user_keys("Betito")
            self.km.generate_user_keys("Candy")
            self.refresh_keys_view()
            messagebox.showinfo("Éxito", "Nuevos pares de llaves generados y publicados.")

    def refresh_keys_view(self):
        text = []
        for user in ["Alicia", "Betito", "Candy"]:
            url = self.km.get_public_key_url(user)
            pem = self.km.load_public_key_pem_text(user)
            text.append(f"=== {user.upper()} ===")
            text.append(f"URL de Descarga: {url}")
            text.append(f"Contenido PEM:\n{pem}")
            text.append("-" * 60)

        self.txt_keys_view.delete("1.0", "end")
        self.txt_keys_view.insert("1.0", "\n".join(text))

    def create_footer(self):
        footer_frame = ctk.CTkFrame(self, height=28, corner_radius=0, fg_color="#12121c")
        footer_frame.pack(fill="x", side="bottom")

        ctk.CTkLabel(
            footer_frame,
            text="Práctica: Criptografía Híbrida | Dra. Nidia A. Cortez Duarte | ESCOM IPN",
            font=ctk.CTkFont(size=11),
            text_color="#565f89"
        ).pack(side="left", padx=15, pady=2)


if __name__ == "__main__":
    app = HybridCryptoApp()
    app.mainloop()
